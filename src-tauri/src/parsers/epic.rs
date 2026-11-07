use crate::models::{InstallStatus, LaunchConfig, Platform, UnifiedGame};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

#[derive(Debug, Deserialize)]
struct HeroicLegendaryLibraryFile {
    #[serde(default)]
    library: Vec<HeroicLibraryEntry>,
}

#[derive(Debug, Deserialize)]
struct HeroicLibraryEntry {
    app_name: String,
    title: String,
    art_square: Option<String>,
    art_cover: Option<String>,
    #[serde(default)]
    is_installed: bool,
    install: Option<HeroicInstallInfo>,
}

#[derive(Debug, Deserialize)]
struct HeroicInstallInfo {
    install_path: Option<String>,
    install_size: Option<serde_json::Value>,
    #[serde(default)]
    is_dlc: bool,
}

#[derive(Debug, Deserialize)]
struct LegendaryInstalledEntry {
    title: String,
    install_path: String,
    install_size: Option<u64>,
    #[serde(default)]
    is_dlc: bool,
}

#[derive(Debug, Deserialize)]
struct LegendaryMetadataFile {
    app_name: String,
    app_title: String,
    metadata: Option<EpicInnerMeta>,
}

#[derive(Debug, Deserialize)]
struct EpicInnerMeta {
    #[serde(rename = "keyImages", default)]
    key_images: Vec<EpicKeyImage>,
    #[serde(rename = "mainGameItem")]
    main_game_item: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct EpicKeyImage {
    #[serde(rename = "type")]
    img_type: String,
    url: String,
}

pub fn find_heroic_roots() -> Vec<PathBuf> {
    let mut out = Vec::new();
    if let Some(cfg) = dirs::config_dir() {
        let native = cfg.join("heroic");
        if native.exists() {
            out.push(native);
        }
    }
    if let Some(home) = dirs::home_dir() {
        let flatpak = home.join(".var/app/com.heroicgameslauncher.hgl/config/heroic");
        if flatpak.exists() {
            out.push(flatpak);
        }
    }
    out
}

fn resolve_heroic_cached_image(heroic_roots: &[PathBuf], url: &str) -> String {
    let variants = [
        url.to_string(),
        format!("{url}?h=400&resize=1&w=300"),
        format!("{url}?h=400&resize=1&w=200"),
    ];

    for root in heroic_roots {
        let cache_dir = root.join("images-cache");
        for candidate in &variants {
            let mut hasher = Sha256::new();
            hasher.update(candidate.as_bytes());
            let hash_hex = hex::encode(hasher.finalize());
            let file_path = cache_dir.join(&hash_hex);
            if file_path.exists() {
                return file_path.to_string_lossy().into_owned();
            }
        }
    }
    url.to_string()
}

fn parse_size_value(v: &serde_json::Value) -> Option<u64> {
    if let Some(n) = v.as_u64() {
        return Some(n);
    }
    let s = v.as_str()?.trim();
    if let Ok(n) = s.parse::<u64>() {
        return Some(n);
    }
    let parts: Vec<&str> = s.split_whitespace().collect();
    if parts.len() == 2 {
        let num: f64 = parts[0].parse().ok()?;
        let mult: f64 = match parts[1].to_uppercase().as_str() {
            "KB" | "KIB" => 1024.0,
            "MB" | "MIB" => 1024.0 * 1024.0,
            "GB" | "GIB" => 1024.0 * 1024.0 * 1024.0,
            _ => 1.0,
        };
        return Some((num * mult) as u64);
    }
    None
}

fn build_epic_launch_config(app_name: &str, install_path: &Path) -> LaunchConfig {
    let has_heroic = Path::new("/usr/bin/heroic").exists() || Path::new("/opt/Heroic/heroic").exists();

    if has_heroic {
        LaunchConfig {
            command_uri_or_bin: format!("heroic://launch/legendary/{app_name}"),
            args: vec![],
            working_dir: Some(install_path.to_path_buf()),
            wine_prefix: None,
        }
    } else {
        let legendary_bin = if Path::new("/usr/bin/legendary").exists() {
            "/usr/bin/legendary"
        } else if Path::new("/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/legendary")
            .exists()
        {
            "/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/legendary"
        } else {
            "legendary"
        };
        LaunchConfig {
            command_uri_or_bin: legendary_bin.into(),
            args: vec!["launch".into(), app_name.into()],
            working_dir: Some(install_path.to_path_buf()),
            wine_prefix: None,
        }
    }
}

pub fn scan_epic_all() -> Vec<UnifiedGame> {
    let heroic_roots = find_heroic_roots();
    let mut legendary_roots: Vec<PathBuf> = Vec::new();

    if let Some(cfg) = dirs::config_dir() {
        let standalone = cfg.join("legendary");
        if standalone.exists() {
            legendary_roots.push(standalone);
        }
    }
    for hr in &heroic_roots {
        let emb = hr.join("legendaryConfig/legendary");
        if emb.exists() {
            legendary_roots.push(emb);
        }
    }

    let mut games: HashMap<String, UnifiedGame> = HashMap::new();

    for hr in &heroic_roots {
        let lib_file = hr.join("store_cache/legendary_library.json");
        let Ok(raw) = fs::read_to_string(&lib_file) else {
            continue;
        };
        let Ok(parsed) = serde_json::from_str::<HeroicLegendaryLibraryFile>(&raw) else {
            continue;
        };

        for entry in parsed.library {
            if entry.install.as_ref().map(|i| i.is_dlc).unwrap_or(false) {
                continue;
            }
            let raw_url = entry
                .art_square
                .clone()
                .or_else(|| entry.art_cover.clone());
            let cover = raw_url
                .as_deref()
                .map(|u| resolve_heroic_cached_image(&heroic_roots, u));
            let hero = entry
                .art_cover
                .as_deref()
                .map(|u| resolve_heroic_cached_image(&heroic_roots, u));

            let inst_path = entry
                .install
                .as_ref()
                .and_then(|i| i.install_path.as_ref())
                .map(PathBuf::from);
            let size_bytes = entry
                .install
                .as_ref()
                .and_then(|i| i.install_size.as_ref())
                .and_then(parse_size_value);

            let launch = if entry.is_installed {
                inst_path
                    .as_deref()
                    .map(|p| build_epic_launch_config(&entry.app_name, p))
            } else {
                None
            };

            games.insert(
                entry.app_name.clone(),
                UnifiedGame {
                    id: format!("epic:{}", entry.app_name),
                    platform_id: entry.app_name.clone(),
                    platform: Platform::Epic,
                    title: entry.title,
                    status: if entry.is_installed {
                        InstallStatus::Installed
                    } else {
                        InstallStatus::Cloud
                    },
                    install_path: inst_path,
                    size_bytes,
                    playtime_minutes: 0,
                    last_played_epoch: None,
                    cover_path_or_url: cover,
                    fallback_cover_url: raw_url,
                    hero_path_or_url: hero,
                    genres: Vec::new(),
                    launch,
                    install_uri: Some(format!("heroic://launch/legendary/{}", entry.app_name)),
                },
            );
        }
    }

    for root in &legendary_roots {
        let meta_dir = root.join("metadata");
        let Ok(entries) = fs::read_dir(&meta_dir) else {
            continue;
        };

        for file in entries.flatten() {
            let Ok(raw) = fs::read_to_string(file.path()) else {
                continue;
            };
            let Ok(meta) = serde_json::from_str::<LegendaryMetadataFile>(&raw) else {
                continue;
            };

            if meta
                .metadata
                .as_ref()
                .and_then(|m| m.main_game_item.as_ref())
                .is_some()
            {
                continue;
            }

            let tall_url = meta.metadata.as_ref().and_then(|m| {
                m.key_images
                    .iter()
                    .find(|img| img.img_type == "DieselGameBoxTall")
                    .or_else(|| m.key_images.first())
                    .map(|img| img.url.clone())
            });

            if let Some(existing) = games.get_mut(&meta.app_name) {
                if existing.fallback_cover_url.is_none() {
                    existing.fallback_cover_url = tall_url;
                }
                continue;
            }

            let cover = tall_url
                .as_deref()
                .map(|u| resolve_heroic_cached_image(&heroic_roots, u));
            let hero = meta.metadata.as_ref().and_then(|m| {
                m.key_images
                    .iter()
                    .find(|img| img.img_type == "DieselGameBox")
                    .map(|img| resolve_heroic_cached_image(&heroic_roots, &img.url))
            });

            games.insert(
                meta.app_name.clone(),
                UnifiedGame {
                    id: format!("epic:{}", meta.app_name),
                    platform_id: meta.app_name.clone(),
                    platform: Platform::Epic,
                    title: meta.app_title,
                    status: InstallStatus::Cloud,
                    install_path: None,
                    size_bytes: None,
                    playtime_minutes: 0,
                    last_played_epoch: None,
                    cover_path_or_url: cover,
                    fallback_cover_url: tall_url,
                    hero_path_or_url: hero,
                    genres: Vec::new(),
                    launch: None,
                    install_uri: Some(format!("heroic://launch/legendary/{}", meta.app_name)),
                },
            );
        }
    }

    for root in &legendary_roots {
        let inst_path = root.join("installed.json");
        let Ok(raw) = fs::read_to_string(&inst_path) else {
            continue;
        };
        let Ok(installed_map) =
            serde_json::from_str::<HashMap<String, LegendaryInstalledEntry>>(&raw)
        else {
            continue;
        };

        for (app_name, inst) in installed_map {
            if inst.is_dlc {
                continue;
            }
            let dir_pb = PathBuf::from(&inst.install_path);
            let launch_cfg = build_epic_launch_config(&app_name, &dir_pb);

            games
                .entry(app_name.clone())
                .and_modify(|g| {
                    g.status = InstallStatus::Installed;
                    g.install_path = Some(dir_pb.clone());
                    if inst.install_size.is_some() {
                        g.size_bytes = inst.install_size;
                    }
                    g.launch = Some(launch_cfg.clone());
                })
                .or_insert(UnifiedGame {
                    id: format!("epic:{app_name}"),
                    platform_id: app_name.clone(),
                    platform: Platform::Epic,
                    title: inst.title,
                    status: InstallStatus::Installed,
                    install_path: Some(dir_pb),
                    size_bytes: inst.install_size,
                    playtime_minutes: 0,
                    last_played_epoch: None,
                    cover_path_or_url: None,
                    fallback_cover_url: None,
                    hero_path_or_url: None,
                    genres: Vec::new(),
                    launch: Some(launch_cfg),
                    install_uri: Some(format!("heroic://launch/legendary/{app_name}")),
                });
        }
    }

    for hr in &heroic_roots {
        for rel in ["store_cache/timestamp.json", "store/timestamp.json"] {
            let ts_path = hr.join(rel);
            if let Ok(raw) = fs::read_to_string(&ts_path) {
                if let Ok(ts_map) = serde_json::from_str::<serde_json::Value>(&raw) {
                    if let Some(obj) = ts_map.as_object() {
                        for (app_name, info) in obj {
                            if let Some(g) = games.get_mut(app_name) {
                                if let Some(mins) = info.get("totalPlayed").and_then(|v| v.as_u64())
                                {
                                    g.playtime_minutes = mins;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    games.into_values().collect()
}
