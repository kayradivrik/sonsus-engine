use crate::db::update_single_cached_game;
use crate::models::{DownloadTaskInfo, Platform};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Default, Clone)]
struct SteamAppLogState {
    is_fully_installed: bool,
    is_committing: bool,
    is_suspended: bool,
    is_downloading: bool,
}

static TRACKED_DOWNLOADING_APPS: Mutex<Option<HashSet<String>>> = Mutex::new(None);

fn parse_quoted_val(text: &str, key: &str) -> Option<String> {
    let pattern = format!("\"{}\"", key);
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with(&pattern) {
            let parts: Vec<&str> = trimmed.split('"').collect();
            if parts.len() >= 4 {
                return Some(parts[3].to_string());
            }
        }
    }
    None
}

fn find_content_log_path(steam_root: &Path) -> Option<PathBuf> {
    let candidates = [
        steam_root.join("logs/content_log.txt"),
        steam_root.join(r"logs\content_log.txt"),
    ];
    for c in &candidates {
        if c.exists() {
            return Some(c.clone());
        }
    }
    if let Some(home) = dirs::home_dir() {
        for fb in [
            home.join(".local/share/Steam/logs/content_log.txt"),
            home.join(".steam/steam/logs/content_log.txt"),
            home.join(".var/app/com.valvesoftware.Steam/.local/share/Steam/logs/content_log.txt"),
        ] {
            if fb.exists() {
                return Some(fb);
            }
        }
    }
    None
}

fn read_content_log_tail(steam_root: &Path) -> Option<String> {
    let path = find_content_log_path(steam_root)?;
    let mut file = fs::File::open(&path).ok()?;
    let len = file.seek(SeekFrom::End(0)).ok()?;
    let to_read = len.min(65536);
    file.seek(SeekFrom::End(-(to_read as i64))).ok()?;
    let mut buffer = vec![0u8; to_read as usize];
    file.read_exact(&mut buffer).ok()?;
    Some(String::from_utf8_lossy(&buffer).into_owned())
}

fn parse_steam_log(log_tail: &str) -> (f64, HashMap<String, SteamAppLogState>) {
    let mut rate_mbps = 0.0;
    let mut app_states: HashMap<String, SteamAppLogState> = HashMap::new();

    for line in log_tail.lines() {
        if let Some(pos) = line.find("Current download rate: ") {
            let rest = &line[pos + 23..];
            let parts: Vec<&str> = rest.split_whitespace().collect();
            if parts.len() >= 2 {
                if let Ok(val) = parts[0].parse::<f64>() {
                    let unit = parts[1].to_lowercase();
                    rate_mbps = if unit.contains("mbps") {
                        val
                    } else if unit.contains("kbps") {
                        val / 1024.0
                    } else if unit.contains("gbps") {
                        val * 1024.0
                    } else {
                        val / (1024.0 * 1024.0)
                    };
                }
            }
        }

        if let Some(pos) = line.find("AppID ") {
            let rest = &line[pos + 6..];
            if let Some(space_idx) = rest.find(' ') {
                let appid = &rest[..space_idx];
                if appid.chars().all(|c| c.is_ascii_digit()) {
                    let event = &rest[space_idx..];
                    let entry = app_states.entry(appid.to_string()).or_default();

                    if event.contains("Fully Installed") {
                        entry.is_fully_installed = true;
                        entry.is_downloading = false;
                        entry.is_committing = false;
                        entry.is_suspended = false;
                    } else if event.contains("Committing") || event.contains("starting commit from") {
                        entry.is_committing = true;
                        entry.is_downloading = false;
                    } else if event.contains("Downloading") {
                        entry.is_downloading = true;
                        entry.is_suspended = false;
                        entry.is_committing = false;
                    } else if event.contains("Suspended") || event.contains("update canceled") {
                        entry.is_suspended = true;
                        entry.is_downloading = false;
                    }
                }
            }
        }
    }

    (rate_mbps, app_states)
}

fn compute_dir_size_fast(dir: &Path, max_depth: usize) -> u64 {
    if max_depth == 0 {
        return 0;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return 0;
    };
    let mut total = 0u64;
    for entry in entries.flatten() {
        if let Ok(meta) = entry.metadata() {
            if meta.is_file() {
                total = total.saturating_add(meta.len());
            } else if meta.is_dir() {
                total = total.saturating_add(compute_dir_size_fast(&entry.path(), max_depth - 1));
            }
        }
    }
    total
}

fn get_steam_download_disk_bytes(downloading_dir: &Path, appid: &str) -> u64 {
    let mut total = 0u64;
    let target = downloading_dir.join(appid);
    if target.is_dir() {
        total = total.saturating_add(compute_dir_size_fast(&target, 5));
    }
    if let Ok(entries) = fs::read_dir(downloading_dir) {
        let prefix = format!("state_{appid}_");
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            if name_str.starts_with(&prefix) {
                if let Ok(m) = entry.metadata() {
                    total = total.saturating_add(m.len());
                }
            }
        }
    }
    total
}

fn format_size_progress(downloaded: u64, total: u64) -> String {
    let gb = 1024.0 * 1024.0 * 1024.0;
    let mb = 1024.0 * 1024.0;
    if total as f64 >= gb {
        format!("{:.2} GB / {:.2} GB", downloaded as f64 / gb, total as f64 / gb)
    } else {
        format!("{:.1} MB / {:.1} MB", downloaded as f64 / mb, total as f64 / mb)
    }
}

pub fn get_steam_active_downloads(
    app_handle: Option<&AppHandle>,
    custom_steam_root: Option<&str>,
) -> Vec<DownloadTaskInfo> {
    let mut tasks = Vec::new();
    let steam_root = match custom_steam_root {
        Some(p) => PathBuf::from(p),
        None => match crate::parsers::steam::find_steam_root() {
            Some(p) => p,
            None => return tasks,
        },
    };

    let (rate_mbps, log_app_states) = match read_content_log_tail(&steam_root) {
        Some(tail) => parse_steam_log(&tail),
        None => (0.0, HashMap::new()),
    };

    let mut library_paths = vec![steam_root.clone()];
    let lib_vdf = steam_root.join("steamapps/libraryfolders.vdf");
    if let Ok(vdf_raw) = fs::read_to_string(&lib_vdf) {
        for line in vdf_raw.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("\"path\"") {
                let parts: Vec<&str> = trimmed.split('"').collect();
                if parts.len() >= 4 {
                    let pb = PathBuf::from(parts[3]);
                    if !library_paths.contains(&pb) {
                        library_paths.push(pb);
                    }
                }
            }
        }
    }

    let mut current_active_appids = HashSet::new();

    for lib_root in &library_paths {
        let steamapps = lib_root.join("steamapps");
        let downloading_dir = steamapps.join("downloading");

        let Ok(entries) = fs::read_dir(&steamapps) else {
            continue;
        };

        for entry in entries.flatten() {
            let fname = entry.file_name();
            let fname_str = fname.to_string_lossy();
            if !fname_str.starts_with("appmanifest_") || !fname_str.ends_with(".acf") {
                continue;
            }

            let Ok(acf_content) = fs::read_to_string(entry.path()) else {
                continue;
            };

            let appid = match parse_quoted_val(&acf_content, "appid") {
                Some(id) => id,
                None => continue,
            };

            let name = parse_quoted_val(&acf_content, "name")
                .unwrap_or_else(|| format!("Steam App {appid}"));
            let state_flags = parse_quoted_val(&acf_content, "StateFlags")
                .and_then(|s| s.parse::<u32>().ok())
                .unwrap_or(0);
            let bytes_to_download = parse_quoted_val(&acf_content, "BytesToDownload")
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(0);
            let bytes_downloaded = parse_quoted_val(&acf_content, "BytesDownloaded")
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(0);
            let bytes_to_stage = parse_quoted_val(&acf_content, "BytesToStage")
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(0);
            let bytes_staged = parse_quoted_val(&acf_content, "BytesStaged")
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(0);

            let is_in_downloading_folder = downloading_dir.join(&appid).exists();
            let is_download_state = (state_flags & 1024) != 0 || state_flags == 1026 || state_flags == 514;
            let log_state = log_app_states.get(&appid);
            let is_log_downloading = log_state.map(|s| s.is_downloading || s.is_committing).unwrap_or(false);

            let is_actively_downloading = (is_download_state && (bytes_to_download > 0 || is_in_downloading_folder))
                || is_in_downloading_folder
                || is_log_downloading;

            // Eğer StateFlags & 4 != 0 (Fully Installed) ise ve indirme klasörü yoksa indirme bitmiştir
            if is_actively_downloading && (state_flags & 4) == 0 {
                current_active_appids.insert(appid.clone());

                let disk_bytes = get_steam_download_disk_bytes(&downloading_dir, &appid);
                let live_bytes = bytes_downloaded.max(bytes_staged).max(disk_bytes);

                let total_target = if bytes_to_stage > 0 && live_bytes > bytes_to_download {
                    bytes_to_stage
                } else if bytes_to_download > 0 {
                    bytes_to_download
                } else {
                    live_bytes.max(1)
                };

                let raw_pct = (live_bytes as f64 / total_target as f64) * 100.0;
                let mut pct = raw_pct.clamp(1.0, 99.0);

                let is_committing = log_state.map(|s| s.is_committing).unwrap_or(false);
                let is_suspended = log_state.map(|s| s.is_suspended).unwrap_or(false)
                    || state_flags == 514
                    || (state_flags == 1026 && !is_in_downloading_folder && rate_mbps == 0.0);

                let (status, speed_text, eta_text) = if is_committing {
                    pct = pct.max(95.0);
                    (
                        "downloading".to_string(),
                        "Diske Yazılıyor".to_string(),
                        "Doğrulanıyor...".to_string(),
                    )
                } else if is_suspended {
                    (
                        "paused".to_string(),
                        "0 B/s".to_string(),
                        "Duraklatıldı".to_string(),
                    )
                } else {
                    let mb_s = rate_mbps / 8.0;
                    let speed = if mb_s >= 0.1 {
                        format!("{:.1} MB/s", mb_s)
                    } else if mb_s > 0.0 {
                        format!("{:.0} KB/s", mb_s * 1024.0)
                    } else {
                        "İndiriliyor...".to_string()
                    };

                    let remaining = total_target.saturating_sub(live_bytes);
                    let bytes_per_sec = (mb_s * 1024.0 * 1024.0) as u64;
                    let eta = if bytes_per_sec > 1024 && remaining > 0 {
                        let secs = remaining / bytes_per_sec;
                        if secs < 60 {
                            format!("{} sn kaldı", secs.max(1))
                        } else if secs < 3600 {
                            format!("{} dk {} sn kaldı", secs / 60, secs % 60)
                        } else {
                            format!("{:.1} sa kaldı", secs as f64 / 3600.0)
                        }
                    } else {
                        "Hesaplanıyor...".to_string()
                    };

                    ("downloading".to_string(), speed, eta)
                };

                let detail_text = if is_committing {
                    "Dosyalar doğrulanıyor ve diske yazılıyor...".to_string()
                } else {
                    format_size_progress(live_bytes, total_target)
                };

                tasks.push(DownloadTaskInfo {
                    game_id: format!("steam:{appid}"),
                    title: name,
                    platform: Platform::Steam,
                    target_dir: steamapps.to_string_lossy().to_string(),
                    status,
                    progress_percent: pct as f32,
                    speed_text,
                    eta_text,
                    detail_text,
                    updated_game: None,
                });
            }
        }
    }

    // Tamamlanan indirmeleri kontrol et
    let mut tracked_guard = TRACKED_DOWNLOADING_APPS.lock().unwrap();
    if let Some(ref prev_tracked) = *tracked_guard {
        for prev_appid in prev_tracked {
            if !current_active_appids.contains(prev_appid) {
                // Önceden iniyordu, şimdi indirme listesinde yok. Tamamlandı mı?
                if let Some(game) = crate::parsers::steam::find_and_parse_single_steam_game(
                    custom_steam_root,
                    prev_appid,
                ) {
                    if game.status == crate::models::InstallStatus::Installed {
                        let _ = update_single_cached_game(&game);
                        let _ = crate::platform_os::send_desktop_notification(
                            "sonsus-engine // İndirme Tamamlandı",
                            &format!("{} Steam indirmesi başarıyla tamamlandı ve oynamaya hazır!", game.title),
                        );

                        let comp_task = DownloadTaskInfo {
                            game_id: format!("steam:{prev_appid}"),
                            title: game.title.clone(),
                            platform: Platform::Steam,
                            target_dir: game.install_path.as_ref().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
                            status: "completed".to_string(),
                            progress_percent: 100.0,
                            speed_text: "Tamamlandı".to_string(),
                            eta_text: "00:00".to_string(),
                            detail_text: format!("{} başarıyla kuruldu!", game.title),
                            updated_game: Some(game.clone()),
                        };

                        if let Some(app) = app_handle {
                            let _ = app.emit("download-updated", &comp_task);
                        }
                        tasks.push(comp_task);
                    }
                }
            }
        }
    }
    *tracked_guard = Some(current_active_appids);

    tasks
}
