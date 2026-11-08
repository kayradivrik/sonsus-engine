use crate::models::{DownloadTaskInfo, Platform};
use std::fs;
use std::path::PathBuf;

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

pub fn get_steam_active_downloads(custom_steam_root: Option<&str>) -> Vec<DownloadTaskInfo> {
    let mut tasks = Vec::new();
    let steam_root = match custom_steam_root {
        Some(p) => PathBuf::from(p),
        None => match crate::parsers::steam::find_steam_root() {
            Some(p) => p,
            None => return tasks,
        },
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

    for lib_root in library_paths {
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

            let name = parse_quoted_val(&acf_content, "name").unwrap_or_else(|| format!("Steam App {appid}"));
            let state_flags = parse_quoted_val(&acf_content, "StateFlags").and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
            let bytes_to_download = parse_quoted_val(&acf_content, "BytesToDownload").and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
            let bytes_downloaded = parse_quoted_val(&acf_content, "BytesDownloaded").and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);

            // StateFlags:
            // 1026 = Downloading / Update Required
            // 4 = Fully Installed
            // If BytesToDownload > 0 and BytesDownloaded < BytesToDownload, or downloading folder exists
            let is_in_downloading_folder = downloading_dir.join(&appid).exists();

            if (bytes_to_download > 0 && bytes_downloaded < bytes_to_download) || is_in_downloading_folder {
                let pct = if bytes_to_download > 0 {
                    ((bytes_downloaded as f64 / bytes_to_download as f64) * 100.0).clamp(0.0, 100.0)
                } else {
                    0.0
                };

                let dl_mb = bytes_downloaded as f64 / (1024.0 * 1024.0);
                let total_mb = bytes_to_download as f64 / (1024.0 * 1024.0);
                let is_paused = state_flags == 514 || state_flags == 1026 && !is_in_downloading_folder;

                tasks.push(DownloadTaskInfo {
                    game_id: format!("steam:{appid}"),
                    title: name,
                    platform: Platform::Steam,
                    target_dir: steamapps.to_string_lossy().to_string(),
                    status: if is_paused { "paused".to_string() } else { "downloading".to_string() },
                    progress_percent: pct as f32,
                    speed_text: "Steam İstemcisi".to_string(),
                    eta_text: if is_paused { "Duraklatıldı".to_string() } else { "İndiriliyor...".to_string() },
                    detail_text: format!("{:.1} MB / {:.1} MB", dl_mb, total_mb),
                    updated_game: None,
                });
            }
        }
    }

    tasks
}
