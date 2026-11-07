//! Epic Games kütüphane tarayıcısı (Linux + Windows).
//! Heroic Games Launcher, Legendary CLI ve Windows Resmi Epic Games Launcher manifestlerini okur.

use crate::{
    models::{InstallStatus, LaunchConfig, Platform, UnifiedGame},
    platform_os::has_binary,
};
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
    developer: Option<String>,
    store_url: Option<String>,
    art_square: Option<String>,
    art_cover: Option<String>,
    #[serde(default)]
    is_installed: bool,
    install: Option<HeroicInstallInfo>,
    extra: Option<HeroicExtraBlock>,
}

#[derive(Debug, Deserialize)]
struct HeroicExtraBlock {
    about: Option<HeroicAboutBlock>,
    #[serde(rename = "storeUrl")]
    store_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HeroicAboutBlock {
    description: Option<String>,
    #[serde(rename = "shortDescription")]
    short_description: Option<String>,
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
    description: Option<String>,
    developer: Option<String>,
    #[serde(rename = "keyImages", default)]
    key_images: Vec<EpicKeyImage>,
    #[serde(rename = "mainGameItem")]
    main_game_item: Option<serde_json::Value>,
    #[serde(default)]
    categories: Vec<EpicCategoryNode>,
}

#[derive(Debug, Deserialize)]
struct EpicCategoryNode {
    path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct EpicKeyImage {
    #[serde(rename = "type")]
    img_type: String,
    url: String,
}

/// Windows Resmi Epic Games Launcher `*.item` manifest yapısı
#[derive(Debug, Deserialize)]
struct WindowsEpicItemManifest {
    #[serde(rename = "AppName")]
    app_name: Option<String>,
    #[serde(rename = "DisplayName")]
    display_name: Option<String>,
    #[serde(rename = "InstallLocation")]
    install_location: Option<String>,
    #[serde(rename = "InstallSize")]
    install_size: Option<u64>,
    #[serde(rename = "LaunchExecutable")]
    launch_executable: Option<String>,
    #[serde(rename = "MainGameAppName")]
    main_game_app_name: Option<String>,
}

pub fn normalize_genre_label(raw: &str) -> Option<&'static str> {
    let lower = raw.trim().to_lowercase();
    if lower.contains("shooter") || lower.contains("fps") {
        Some("Shooter")
    } else if lower.contains("horror") {
        Some("Horror")
    } else if lower.contains("rpg") || lower.contains("role-playing") || lower.contains("role playing") {
        Some("RPG")
    } else if lower.contains("racing") || lower.contains("driving") {
        Some("Racing")
    } else if lower.contains("strategy") || lower.contains("tactical") || lower.contains("turn-based") {
        Some("Strategy")
    } else if lower.contains("simulation") || lower.contains("simulator") {
        Some("Simulation")
    } else if lower.contains("sport") {
        Some("Sports")
    } else if lower.contains("indie") {
        Some("Indie")
    } else if lower.contains("adventure") {
        Some("Adventure")
    } else if lower.contains("action") || lower.contains("fighting") || lower.contains("platformer") {
        Some("Action")
    } else {
        None
    }
}

pub fn extract_epic_slug_from_url(url: &str) -> Option<String> {
    let trimmed = url.trim().trim_end_matches('/');
    for marker in ["/product/", "/p/"] {
        if let Some(idx) = trimmed.find(marker) {
            let slug = &trimmed[idx + marker.len()..];
            let clean = slug.split('?').next().unwrap_or(slug).trim_matches('/');
            if !clean.is_empty() {
                return Some(clean.to_string());
            }
        }
    }
    None
}

pub fn find_heroic_roots() -> Vec<PathBuf> {
    let mut out = Vec::new();
    // Linux (`~/.config/heroic`) & Windows (`%APPDATA%\heroic`)
    if let Some(cfg) = dirs::config_dir() {
        let native = cfg.join("heroic");
        if native.exists() {
            out.push(native);
        }
    }
    if let Some(home) = dirs::home_dir() {
        let flatpak = home.join(".var/app/com.heroicgameslauncher.hgl/config/heroic");
        if flatpak.exists() && !out.contains(&flatpak) {
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

/// Heroic `store_cache/gog_api_info.json` dosyasından Epic ve GOG oyunları için tür (genre) ve özet haritası çıkarır
pub fn load_heroic_gogdb_cache(heroic_roots: &[PathBuf]) -> HashMap<String, (Vec<String>, Option<String>)> {
    let mut map = HashMap::new();
    for hr in heroic_roots {
        let p = hr.join("store_cache/gog_api_info.json");
        let Ok(raw) = fs::read_to_string(&p) else {
            continue;
        };
        let Ok(root) = serde_json::from_str::<serde_json::Value>(&raw) else {
            continue;
        };
        let Some(obj) = root.as_object() else {
            continue;
        };
        for (key, entry) in obj {
            let summary = entry
                .get("summary")
                .and_then(|s| s.get("*").or_else(|| s.get("en-US")))
                .and_then(|v| v.as_str())
                .filter(|s| !s.trim().is_empty())
                .map(ToOwned::to_owned);

            let mut genres: Vec<String> = Vec::new();
            if let Some(arr) = entry
                .get("game")
                .and_then(|g| g.get("genres"))
                .and_then(|v| v.as_array())
            {
                for g_item in arr {
                    if let Some(raw_name) = g_item
                        .get("name")
                        .and_then(|n| n.get("*").or_else(|| n.get("en-US")))
                        .and_then(|v| v.as_str())
                    {
                        if let Some(norm) = normalize_genre_label(raw_name) {
                            if !genres.iter().any(|x| x == norm) {
                                genres.push(norm.to_string());
                            }
                        }
                    }
                }
            }
            map.insert(key.clone(), (genres, summary));
        }
    }
    map
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

pub fn find_legendary_binary_path() -> Option<String> {
    if has_binary("legendary") {
        return Some("legendary".into());
    }
    let candidates = [
        "/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/legendary",
        "/usr/lib/heroic/resources/app.asar.unpacked/build/bin/x64/linux/legendary",
        r"C:\Program Files\Heroic\resources\app.asar.unpacked\build\bin\x64\win32\legendary.exe",
    ];
    for c in candidates {
        if Path::new(c).exists() {
            return Some(c.into());
        }
    }
    #[cfg(windows)]
    if let Some(local) = dirs::data_local_dir() {
        let user_heroic = local
            .join("Programs/heroic/resources/app.asar.unpacked/build/bin/x64/win32/legendary.exe");
        if user_heroic.exists() {
            return Some(user_heroic.to_string_lossy().into_owned());
        }
    }
    None
}

fn build_epic_launch_config(app_name: &str, install_path: &Path) -> LaunchConfig {
    let has_heroic = has_binary("heroic")
        || Path::new("/opt/Heroic/heroic").exists()
        || Path::new(r"C:\Program Files\Heroic\Heroic.exe").exists();

    if has_heroic {
        LaunchConfig {
            command_uri_or_bin: format!("heroic://launch/legendary/{app_name}"),
            args: vec![],
            working_dir: Some(install_path.to_path_buf()),
            wine_prefix: None,
        }
    } else if let Some(leg_bin) = find_legendary_binary_path() {
        LaunchConfig {
            command_uri_or_bin: leg_bin,
            args: vec!["launch".into(), app_name.into()],
            working_dir: Some(install_path.to_path_buf()),
            wine_prefix: None,
        }
    } else {
        LaunchConfig {
            command_uri_or_bin: format!(
                "com.epicgames.launcher://apps/{app_name}?action=launch&silent=true"
            ),
            args: vec![],
            working_dir: Some(install_path.to_path_buf()),
            wine_prefix: None,
        }
    }
}

/// Windows Resmi Epic Games Launcher kurulu oyun manifestlerini (`C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests`) okur
fn scan_windows_official_epic(games: &mut HashMap<String, UnifiedGame>) {
    let mut manifest_dirs = vec![PathBuf::from(
        r"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests",
    )];
    if let Ok(pd) = std::env::var("PROGRAMDATA") {
        let p = PathBuf::from(pd).join(r"Epic\EpicGamesLauncher\Data\Manifests");
        if !manifest_dirs.contains(&p) {
            manifest_dirs.push(p);
        }
    }

    for dir in manifest_dirs {
        let Ok(entries) = fs::read_dir(&dir) else {
            continue;
        };
        for file in entries.flatten() {
            let path = file.path();
            if path.extension().and_then(|e| e.to_str()) != Some("item") {
                continue;
            }
            let Ok(raw) = fs::read_to_string(&path) else {
                continue;
            };
            let Ok(item) = serde_json::from_str::<WindowsEpicItemManifest>(&raw) else {
                continue;
            };
            let Some(app_name) = item.app_name else {
                continue;
            };
            // DLC ise atla
            if let Some(ref main_app) = item.main_game_app_name {
                if !main_app.is_empty() && main_app != &app_name {
                    continue;
                }
            }
            let title = item.display_name.unwrap_or_else(|| app_name.clone());
            let inst_pb = item.install_location.map(PathBuf::from);
            let is_installed = inst_pb.as_ref().map(|p| p.exists()).unwrap_or(false);

            let launch = if is_installed {
                if let (Some(ref dir_pb), Some(ref exe_rel)) = (&inst_pb, &item.launch_executable) {
                    let full_exe = dir_pb.join(exe_rel);
                    if full_exe.exists() {
                        Some(LaunchConfig {
                            command_uri_or_bin: full_exe.to_string_lossy().into_owned(),
                            args: vec![],
                            working_dir: Some(dir_pb.clone()),
                            wine_prefix: None,
                        })
                    } else {
                        Some(LaunchConfig {
                            command_uri_or_bin: format!(
                                "com.epicgames.launcher://apps/{app_name}?action=launch&silent=true"
                            ),
                            args: vec![],
                            working_dir: Some(dir_pb.clone()),
                            wine_prefix: None,
                        })
                    }
                } else {
                    None
                }
            } else {
                None
            };

            games
                .entry(app_name.clone())
                .and_modify(|g| {
                    if is_installed {
                        g.status = InstallStatus::Installed;
                        g.install_path = inst_pb.clone();
                        g.size_bytes = item.install_size.or(g.size_bytes);
                        g.launch = launch.clone().or_else(|| g.launch.clone());
                    }
                })
                .or_insert(UnifiedGame {
                    id: format!("epic:{app_name}"),
                    platform_id: app_name.clone(),
                    platform: Platform::Epic,
                    title,
                    status: if is_installed {
                        InstallStatus::Installed
                    } else {
                        InstallStatus::Cloud
                    },
                    install_path: inst_pb,
                    size_bytes: item.install_size,
                    playtime_minutes: 0,
                    last_played_epoch: None,
                    cover_path_or_url: None,
                    fallback_cover_url: None,
                    hero_path_or_url: None,
                    genres: Vec::new(),
                    developer: None,
                    store_slug: None,
                    summary_hint: None,
                    is_favorite: false,
                    is_hidden: false,
                    collection_tag: None,
                    update_available: None,
                    launch,
                    install_uri: Some(format!(
                        "com.epicgames.launcher:// store/product/{app_name}"
                    )),
                });
        }
    }
}

pub fn scan_epic_all() -> Vec<UnifiedGame> {
    let heroic_roots = find_heroic_roots();
    let gogdb_cache = load_heroic_gogdb_cache(&heroic_roots);
    let mut legendary_roots: Vec<PathBuf> = Vec::new();

    if let Some(cfg) = dirs::config_dir() {
        let standalone = cfg.join("legendary");
        if standalone.exists() {
            legendary_roots.push(standalone);
        }
    }
    if let Some(home) = dirs::home_dir() {
        let home_leg = home.join(".config/legendary");
        if home_leg.exists() && !legendary_roots.contains(&home_leg) {
            legendary_roots.push(home_leg);
        }
    }
    for hr in &heroic_roots {
        let emb = hr.join("legendaryConfig/legendary");
        if emb.exists() && !legendary_roots.contains(&emb) {
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
            let raw_url = entry.art_square.clone().or_else(|| entry.art_cover.clone());
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

            let slug = entry
                .store_url
                .as_deref()
                .or_else(|| {
                    entry
                        .extra
                        .as_ref()
                        .and_then(|e| e.store_url.as_deref())
                })
                .and_then(extract_epic_slug_from_url);

            let local_desc = entry
                .extra
                .as_ref()
                .and_then(|e| e.about.as_ref())
                .and_then(|a| {
                    a.short_description
                        .as_deref()
                        .filter(|s| !s.trim().is_empty())
                        .or_else(|| a.description.as_deref().filter(|s| !s.trim().is_empty()))
                })
                .map(ToOwned::to_owned);

            let gogdb_key = format!("epic_{}", entry.app_name);
            let (cached_genres, cached_summary) = gogdb_cache
                .get(&gogdb_key)
                .cloned()
                .unwrap_or_else(|| (Vec::new(), None));

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
                    genres: cached_genres,
                    developer: entry.developer.filter(|s| !s.trim().is_empty()),
                    store_slug: slug,
                    summary_hint: local_desc.or(cached_summary),
                    is_favorite: false,
                    is_hidden: false,
                    collection_tag: None,
                    update_available: None,
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

            let meta_desc = meta
                .metadata
                .as_ref()
                .and_then(|m| m.description.clone())
                .filter(|s| !s.trim().is_empty());
            let meta_dev = meta
                .metadata
                .as_ref()
                .and_then(|m| m.developer.clone())
                .filter(|s| !s.trim().is_empty());

            let mut meta_genres: Vec<String> = Vec::new();
            if let Some(ref inner) = meta.metadata {
                for cat in &inner.categories {
                    if let Some(ref p) = cat.path {
                        if let Some(norm) = normalize_genre_label(p) {
                            if !meta_genres.iter().any(|x| x == norm) {
                                meta_genres.push(norm.to_string());
                            }
                        }
                    }
                }
            }

            if let Some(existing) = games.get_mut(&meta.app_name) {
                if existing.fallback_cover_url.is_none() {
                    existing.fallback_cover_url = tall_url;
                }
                if existing.summary_hint.is_none() {
                    existing.summary_hint = meta_desc;
                }
                if existing.developer.is_none() {
                    existing.developer = meta_dev;
                }
                if existing.genres.is_empty() && !meta_genres.is_empty() {
                    existing.genres = meta_genres;
                }
                continue;
            }

            let gogdb_key = format!("epic_{}", meta.app_name);
            let (mut cached_genres, cached_summary) = gogdb_cache
                .get(&gogdb_key)
                .cloned()
                .unwrap_or_else(|| (Vec::new(), None));
            if cached_genres.is_empty() {
                cached_genres = meta_genres;
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
                    genres: cached_genres,
                    developer: meta_dev,
                    store_slug: None,
                    summary_hint: meta_desc.or(cached_summary),
                    is_favorite: false,
                    is_hidden: false,
                    collection_tag: None,
                    update_available: None,
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
                    developer: None,
                    store_slug: None,
                    summary_hint: None,
                    is_favorite: false,
                    is_hidden: false,
                    collection_tag: None,
                    update_available: None,
                    launch: Some(launch_cfg),
                    install_uri: Some(format!("heroic://launch/legendary/{app_name}")),
                });
        }
    }

    // Windows Resmi Epic Games Launcher manifestlerini de birleştir
    scan_windows_official_epic(&mut games);

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
