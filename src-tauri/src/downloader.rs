//! Uygulama içi arka plan indirme yöneticisi (`downloader.rs`).
//!
//! Harici Heroic veya terminal penceresi açmadan Epic (`legendary`) ve GOG (`gogdl`) oyunlarını
//! doğrudan seçilen dizine indirir; canlı yüzde, hız (`MiB/s`) ve kalan süre (`ETA`) akışı üretir.

use crate::{
    db::update_single_cached_game,
    models::{DownloadTaskInfo, InstallStatus, LaunchConfig, Platform, UnifiedGame},
    parsers::epic::{find_heroic_roots, find_legendary_binary_path},
    platform_os::has_binary,
};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::Stdio,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter};
use tokio::{
    io::{AsyncBufReadExt, BufReader},
    process::Command as TokioCommand,
    sync::oneshot,
};

struct ActiveSlot {
    info: DownloadTaskInfo,
    cancel_tx: Option<oneshot::Sender<()>>,
}

#[derive(Default)]
pub struct DownloadManager {
    slots: Mutex<HashMap<String, ActiveSlot>>,
}

fn find_gogdl_binary_path() -> Option<String> {
    if has_binary("gogdl") {
        return Some("gogdl".into());
    }
    let candidates = [
        "/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/gogdl",
        "/usr/lib/heroic/resources/app.asar.unpacked/build/bin/x64/linux/gogdl",
        r"C:\Program Files\Heroic\resources\app.asar.unpacked\build\bin\x64\win32\gogdl.exe",
    ];
    for c in candidates {
        if Path::new(c).exists() {
            return Some(c.into());
        }
    }
    None
}

fn parse_progress_line(line: &str, info: &mut DownloadTaskInfo) -> bool {
    let mut changed = false;

    // Örn: `[cli] INFO: Progress: 42.50% (1250/2940), Running for 00:01:12, ETA: 00:02:10`
    if let Some(p_idx) = line.find("Progress:") {
        let rest = line[p_idx + "Progress:".len()..].trim();
        if let Some(pct_str) = rest.split('%').next() {
            if let Ok(pct) = pct_str.trim().parse::<f32>() {
                info.progress_percent = pct.clamp(0.0, 100.0);
                changed = true;
            }
        }
        if let Some(eta_idx) = rest.find("ETA:") {
            let eta_part = rest[eta_idx + 4..].split(',').next().unwrap_or("").trim();
            if !eta_part.is_empty() {
                info.eta_text = eta_part.to_string();
                changed = true;
            }
        }
    }

    // Örn: `[cli] INFO:  + Download	- 48.25 MiB/s (raw) / 51.10 MiB/s (decompressed)`
    if line.contains("Download") && line.contains("MiB/s") {
        if let Some(dash_idx) = line.find('-') {
            let speed_raw = line[dash_idx + 1..]
                .split('(')
                .next()
                .unwrap_or("")
                .trim();
            if !speed_raw.is_empty() {
                info.speed_text = speed_raw.to_string();
                changed = true;
            }
        }
    }

    if line.contains("Downloaded:") {
        if let Some(dl_idx) = line.find("Downloaded:") {
            let part = line[dl_idx + "Downloaded:".len()..]
                .split(',')
                .next()
                .unwrap_or("")
                .trim();
            if !part.is_empty() {
                info.detail_text = format!("İndirilen: {part}");
                changed = true;
            }
        }
    }

    changed
}

fn resolve_epic_installed_after_download(app_name: &str, fallback_base: &str) -> (PathBuf, Option<u64>) {
    let mut legendary_roots: Vec<PathBuf> = Vec::new();
    if let Some(cfg) = dirs::config_dir() {
        legendary_roots.push(cfg.join("legendary"));
    }
    for hr in find_heroic_roots() {
        legendary_roots.push(hr.join("legendaryConfig/legendary"));
    }

    for root in legendary_roots {
        let inst_file = root.join("installed.json");
        if let Ok(raw) = fs::read_to_string(inst_file) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) {
                if let Some(entry) = json.get(app_name) {
                    if let Some(p) = entry.get("install_path").and_then(|v| v.as_str()) {
                        let size = entry.get("install_size").and_then(|v| v.as_u64());
                        return (PathBuf::from(p), size);
                    }
                }
            }
        }
    }

    (PathBuf::from(fallback_base), None)
}

impl DownloadManager {
    pub fn list_tasks(&self) -> Vec<DownloadTaskInfo> {
        let guard = self.slots.lock().unwrap();
        let mut list: Vec<DownloadTaskInfo> = guard.values().map(|s| s.info.clone()).collect();
        list.sort_by(|a, b| a.title.cmp(&b.title));
        list
    }

    pub fn pause_task(&self, app: &AppHandle, game_id: &str) -> Result<(), String> {
        let mut guard = self.slots.lock().unwrap();
        if let Some(slot) = guard.get_mut(game_id) {
            if let Some(tx) = slot.cancel_tx.take() {
                let _ = tx.send(());
            }
            slot.info.status = "paused".into();
            slot.info.speed_text.clear();
            slot.info.detail_text = "Duraklatıldı — İstediğiniz zaman kaldığı yerden devam ettirebilirsiniz".into();
            let _ = app.emit("download-updated", &slot.info);
        }
        Ok(())
    }

    pub fn remove_task(&self, app: &AppHandle, game_id: &str) {
        let mut guard = self.slots.lock().unwrap();
        if let Some(mut slot) = guard.remove(game_id) {
            if let Some(tx) = slot.cancel_tx.take() {
                let _ = tx.send(());
            }
        }
        let _ = app.emit("download-removed", game_id);
    }

    pub fn start_download(
        self: &Arc<Self>,
        app: AppHandle,
        game: UnifiedGame,
        target_dir: String,
    ) -> Result<DownloadTaskInfo, String> {
        let clean_target = if target_dir.trim().is_empty() {
            dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("Games")
                .to_string_lossy()
                .into_owned()
        } else {
            target_dir.trim().to_string()
        };

        fs::create_dir_all(&clean_target)
            .map_err(|e| format!("Hedef klasör oluşturulamadı ({clean_target}): {e}"))?;

        let mut cmd = match game.platform {
            Platform::Epic => {
                let bin = find_legendary_binary_path().ok_or_else(|| {
                    "Doğrudan uygulama içi indirme için sistemde Legendary motoru bulunamadı."
                        .to_string()
                })?;
                let mut c = TokioCommand::new(bin);
                c.args([
                    "install",
                    &game.platform_id,
                    "--base-path",
                    &clean_target,
                    "-y",
                ]);
                if let Some(cfg) = dirs::config_dir() {
                    let heroic_xdg = cfg.join("heroic/legendaryConfig");
                    if heroic_xdg.exists() && !cfg.join("legendary/user.json").exists() {
                        c.env("XDG_CONFIG_HOME", &heroic_xdg);
                        c.env("LEGENDARY_CONFIG_PATH", heroic_xdg.join("legendary"));
                    }
                }
                c
            }
            Platform::Gog => {
                let bin = find_gogdl_binary_path().ok_or_else(|| {
                    "Doğrudan GOG indirmesi için sistemde gogdl motoru bulunamadı.".to_string()
                })?;
                let mut c = TokioCommand::new(bin);
                if let Some(hr) = find_heroic_roots().into_iter().next() {
                    let auth = hr.join("gog_store/auth.json");
                    if auth.exists() {
                        c.arg("--auth-config-path").arg(auth);
                    }
                }
                c.args([
                    "download",
                    &game.platform_id,
                    "--path",
                    &clean_target,
                ]);
                c
            }
            Platform::Steam => {
                return Err(
                    "Steam şifreli CDN protokolü kullandığı için indirmeyi 'Steam İstemcisi' seçeneği ile başlatabilirsiniz."
                        .into(),
                );
            }
        };

        cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

        #[cfg(windows)]
        {
            #[allow(unused_imports)]
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
        }

        // Aynı oyun için çalışan eski indirme varsa önce durdur
        let _ = self.pause_task(&app, &game.id);

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("İndirme motoru başlatılamadı: {e}"))?;

        let (cancel_tx, mut cancel_rx) = oneshot::channel::<()>();
        let initial_info = DownloadTaskInfo {
            game_id: game.id.clone(),
            title: game.title.clone(),
            platform: game.platform,
            target_dir: clean_target.clone(),
            status: "downloading".into(),
            progress_percent: 0.0,
            speed_text: "Bağlanıyor...".into(),
            eta_text: "Hesaplanıyor".into(),
            detail_text: format!("Hedef: {clean_target}"),
            updated_game: None,
        };

        {
            let mut guard = self.slots.lock().unwrap();
            guard.insert(
                game.id.clone(),
                ActiveSlot {
                    info: initial_info.clone(),
                    cancel_tx: Some(cancel_tx),
                },
            );
        }

        let _ = app.emit("download-updated", &initial_info);

        let mgr = Arc::clone(self);
        let game_clone = game.clone();
        let target_clone = clean_target.clone();

        tauri::async_runtime::spawn(async move {
            let stderr = child.stderr.take();
            let stdout = child.stdout.take();

            let (line_tx, mut line_rx) = tokio::sync::mpsc::unbounded_channel::<String>();

            if let Some(err_pipe) = stderr {
                let tx_e = line_tx.clone();
                tokio::spawn(async move {
                    let mut lines = BufReader::new(err_pipe).lines();
                    while let Ok(Some(l)) = lines.next_line().await {
                        let _ = tx_e.send(l);
                    }
                });
            }
            if let Some(out_pipe) = stdout {
                let tx_o = line_tx.clone();
                tokio::spawn(async move {
                    let mut lines = BufReader::new(out_pipe).lines();
                    while let Ok(Some(l)) = lines.next_line().await {
                        let _ = tx_o.send(l);
                    }
                });
            }
            drop(line_tx);

            let mut last_emit = Instant::now() - Duration::from_secs(1);
            let mut last_err_line = String::new();

            loop {
                tokio::select! {
                    _ = &mut cancel_rx => {
                        let _ = child.kill().await;
                        return;
                    }
                    maybe_line = line_rx.recv() => {
                        match maybe_line {
                            Some(line) => {
                                if line.contains("ERROR") || line.contains("CRITICAL") {
                                    last_err_line = line.clone();
                                }
                                let mut emit_snapshot = None;
                                {
                                    let mut guard = mgr.slots.lock().unwrap();
                                    if let Some(slot) = guard.get_mut(&game_clone.id) {
                                        if slot.info.status == "downloading" && parse_progress_line(&line, &mut slot.info) {
                                            if last_emit.elapsed() >= Duration::from_millis(250) {
                                                last_emit = Instant::now();
                                                emit_snapshot = Some(slot.info.clone());
                                            }
                                        }
                                    }
                                }
                                if let Some(snap) = emit_snapshot {
                                    let _ = app.emit("download-updated", &snap);
                                }
                            }
                            None => break,
                        }
                    }
                }
            }

            let exit_ok = child.wait().await.map(|s| s.success()).unwrap_or(false);

            let mut final_snapshot = None;
            {
                let mut guard = mgr.slots.lock().unwrap();
                if let Some(slot) = guard.get_mut(&game_clone.id) {
                    if slot.info.status != "downloading" {
                        return;
                    }
                    if exit_ok {
                        let (inst_pb, disk_sz) = if game_clone.platform == Platform::Epic {
                            resolve_epic_installed_after_download(&game_clone.platform_id, &target_clone)
                        } else {
                            (PathBuf::from(&target_clone), None)
                        };

                        let mut finished_game = game_clone.clone();
                        finished_game.status = InstallStatus::Installed;
                        finished_game.install_path = Some(inst_pb.clone());
                        if disk_sz.is_some() {
                            finished_game.size_bytes = disk_sz;
                        }
                        finished_game.launch = Some(LaunchConfig {
                            command_uri_or_bin: if let Some(leg) = find_legendary_binary_path() {
                                if game_clone.platform == Platform::Epic {
                                    leg
                                } else {
                                    format!("heroic://launch/gog/{}", game_clone.platform_id)
                                }
                            } else {
                                format!("heroic://launch/legendary/{}", game_clone.platform_id)
                            },
                            args: if game_clone.platform == Platform::Epic {
                                vec!["launch".into(), game_clone.platform_id.clone()]
                            } else {
                                vec![]
                            },
                            working_dir: Some(inst_pb),
                            wine_prefix: None,
                        });
                        let _ = update_single_cached_game(&finished_game);

                        slot.info.status = "completed".into();
                        slot.info.progress_percent = 100.0;
                        slot.info.speed_text = "Tamamlandı".into();
                        slot.info.eta_text = "00:00".into();
                        slot.info.detail_text = "Kurulum başarıyla tamamlandı!".into();
                        slot.info.updated_game = Some(finished_game);
                        slot.cancel_tx = None;
                    } else {
                        slot.info.status = "failed".into();
                        slot.info.speed_text.clear();
                        slot.info.detail_text = if last_err_line.is_empty() {
                            "İndirme işlemi sonlandı (Oturum veya disk alanını kontrol edin).".into()
                        } else {
                            last_err_line
                        };
                        slot.cancel_tx = None;
                    }
                    final_snapshot = Some(slot.info.clone());
                }
            }

            if let Some(snap) = final_snapshot {
                let _ = app.emit("download-updated", &snap);
            }
        });

        Ok(initial_info)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_legendary_progress_and_speed_lines() {
        let mut info = DownloadTaskInfo {
            game_id: "epic:test".into(),
            title: "Test Game".into(),
            platform: Platform::Epic,
            target_dir: "/tmp/Games".into(),
            status: "downloading".into(),
            progress_percent: 0.0,
            speed_text: String::new(),
            eta_text: String::new(),
            detail_text: String::new(),
            updated_game: None,
        };

        assert!(parse_progress_line(
            "[cli] INFO: Progress: 42.50% (1250/2940), Running for 00:01:12, ETA: 00:02:10",
            &mut info
        ));
        assert!((info.progress_percent - 42.5).abs() < 0.01);
        assert_eq!(info.eta_text, "00:02:10");

        assert!(parse_progress_line(
            "[cli] INFO:  + Download\t- 48.25 MiB/s (raw) / 51.10 MiB/s (decompressed)",
            &mut info
        ));
        assert_eq!(info.speed_text, "48.25 MiB/s");
    }
}
