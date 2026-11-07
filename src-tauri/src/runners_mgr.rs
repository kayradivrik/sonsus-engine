//! Uygulama içi GE-Proton ve Wine runner yöneticisi (`runners_mgr.rs`).
//!
//! GloriousEggroll/proton-ge-custom GitHub sürümlerini sorgular, tek tıkla indirip
//! `~/.steam/root/compatibilitytools.d/` dizinine kurar ve canlı `%` ilerlemesi bildirir.

use crate::models::{RemoteRunnerRelease, RunnerInfo, RunnerInstallProgress};
use std::{
    fs,
    path::PathBuf,
    process::Command,
    time::Duration,
};
use tauri::{AppHandle, Emitter};

pub fn get_compatibility_tools_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let target = home.join(".steam/root/compatibilitytools.d");
    if !target.exists() {
        let _ = fs::create_dir_all(&target);
    }
    target
}

/// GitHub API'sinden son GE-Proton sürümlerini çeker.
pub async fn fetch_ge_proton_releases() -> Result<Vec<RemoteRunnerRelease>, String> {
    let client = reqwest::Client::builder()
        .user_agent("sonsus-engine/1.0.0")
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = "https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases?per_page=8";
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("GitHub API hatası: {}", resp.status()));
    }

    let releases: Vec<serde_json::Value> = resp.json().await.map_err(|e| e.to_string())?;
    let tools_dir = get_compatibility_tools_dir();

    let mut result = Vec::new();
    for rel in releases {
        let tag_name = rel.get("tag_name").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let name = rel.get("name").and_then(|v| v.as_str()).unwrap_or(&tag_name).to_string();
        let published_at = rel.get("published_at").and_then(|v| v.as_str()).unwrap_or("").to_string();

        let mut download_url = String::new();
        let mut size_bytes = 0u64;

        if let Some(assets) = rel.get("assets").and_then(|v| v.as_array()) {
            for asset in assets {
                let fname = asset.get("name").and_then(|v| v.as_str()).unwrap_or("");
                if fname.ends_with(".tar.gz") {
                    if let Some(u) = asset.get("browser_download_url").and_then(|v| v.as_str()) {
                        download_url = u.to_string();
                        size_bytes = asset.get("size").and_then(|v| v.as_u64()).unwrap_or(0);
                        break;
                    }
                }
            }
        }

        if !download_url.is_empty() {
            let is_installed = tools_dir.join(&tag_name).exists();
            result.push(RemoteRunnerRelease {
                tag_name,
                name,
                published_at,
                download_url,
                size_bytes,
                is_installed,
            });
        }
    }

    Ok(result)
}

/// Seçilen GE-Proton sürümünü indirir ve arşivden çıkartır. Canlı tauri emit ("runner-install-progress") yapar.
pub async fn install_ge_proton_release(
    app: AppHandle,
    tag_name: String,
    download_url: String,
) -> Result<RunnerInfo, String> {
    let tools_dir = get_compatibility_tools_dir();
    let temp_archive = tools_dir.join(format!("{tag_name}.tar.gz.tmp"));

    let client = reqwest::Client::builder()
        .user_agent("sonsus-engine/1.0.0")
        .build()
        .map_err(|e| e.to_string())?;

    let mut resp = client.get(&download_url).send().await.map_err(|e| e.to_string())?;
    let total_bytes = resp.content_length().unwrap_or(0);

    let _ = app.emit(
        "runner-install-progress",
        RunnerInstallProgress {
            tag_name: tag_name.clone(),
            percent: 0.0,
            status_text: "İndirme başlatılıyor...".into(),
            done: false,
        },
    );

    use tokio::io::AsyncWriteExt;

    let mut file = tokio::fs::File::create(&temp_archive)
        .await
        .map_err(|e| format!("Geçici dosya oluşturulamadı: {e}"))?;

    let mut downloaded: u64 = 0;
    let mut last_emit = std::time::Instant::now();

    while let Some(chunk) = resp.chunk().await.map_err(|e| format!("İndirme akışı hatası: {e}"))? {
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Diske yazılamadı: {e}"))?;
        downloaded += chunk.len() as u64;

        if total_bytes > 0 && last_emit.elapsed() >= Duration::from_millis(200) {
            last_emit = std::time::Instant::now();
            let pct = ((downloaded as f32 / total_bytes as f32) * 100.0).clamp(0.0, 99.0);
            let mb = downloaded / 1_048_576;
            let total_mb = total_bytes / 1_048_576;
            let _ = app.emit(
                "runner-install-progress",
                RunnerInstallProgress {
                    tag_name: tag_name.clone(),
                    percent: pct,
                    status_text: format!("İndiriliyor: {mb} MB / {total_mb} MB (%{pct:.1})"),
                    done: false,
                },
            );
        }
    }
    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    let _ = app.emit(
        "runner-install-progress",
        RunnerInstallProgress {
            tag_name: tag_name.clone(),
            percent: 99.0,
            status_text: "Arşivden çıkarılıyor (tar -xzf)...".into(),
            done: false,
        },
    );

    // Arşivi çıkar
    let out = Command::new("tar")
        .args(["-xzf", temp_archive.to_string_lossy().as_ref(), "-C", tools_dir.to_string_lossy().as_ref()])
        .output()
        .map_err(|e| format!("tar komutu çalıştırılamadı: {e}"))?;

    let _ = fs::remove_file(&temp_archive);

    if !out.status.success() {
        return Err("Arşiv açma başarısız oldu.".into());
    }

    let installed_runner_path = tools_dir.join(&tag_name).join("proton");
    let runner_path_str = if installed_runner_path.exists() {
        installed_runner_path.to_string_lossy().into_owned()
    } else {
        tools_dir.join(&tag_name).to_string_lossy().into_owned()
    };

    let runner_info = RunnerInfo {
        name: tag_name.clone(),
        path: runner_path_str,
        kind: "proton".into(),
    };

    let _ = app.emit(
        "runner-install-progress",
        RunnerInstallProgress {
            tag_name: tag_name.clone(),
            percent: 100.0,
            status_text: "Kurulum tamamlandı ve Steam/sonsus kütüphanesine eklendi!".into(),
            done: true,
        },
    );

    Ok(runner_info)
}
