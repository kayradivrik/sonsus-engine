use crate::models::{InstallStatus, LaunchConfig, Platform, UnifiedGame};
use serde::Deserialize;
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
};

#[derive(Debug, Deserialize)]
struct LibraryFoldersRoot {
    #[serde(flatten)]
    folders: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct AppManifest {
    appid: String,
    name: String,
    #[serde(rename = "StateFlags")]
    state_flags: String,
    installdir: String,
    #[serde(rename = "SizeOnDisk")]
    size_on_disk: Option<String>,
    #[serde(rename = "LastPlayed")]
    last_played: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OwnedGamesResponse {
    response: OwnedGamesInner,
}

#[derive(Debug, Deserialize)]
struct OwnedGamesInner {
    games: Option<Vec<SteamApiGame>>,
}

#[derive(Debug, Deserialize)]
struct SteamApiGame {
    appid: u64,
    name: Option<String>,
    playtime_forever: Option<u64>,
    rtime_last_played: Option<i64>,
}

#[derive(Debug, Clone, Default)]
struct LocalUserAppStats {
    playtime_minutes: u64,
    last_played_epoch: Option<i64>,
}

#[derive(Debug, Clone)]
struct ParsedSteamAppInfo {
    name: String,
    genres: Vec<String>,
}

const IGNORED_STEAM_APPS: &[&str] = &[
    "228980",
    "1070560",
    "1391110",
    "1628350",
    "1493710",
    "2348590",
    "2180100",
    "1887720",
    "2805730",
];

fn is_ignored_runtime(appid: &str, title: &str) -> bool {
    if IGNORED_STEAM_APPS.contains(&appid) {
        return true;
    }
    let lower = title.to_lowercase();
    lower.starts_with("proton ")
        || lower.starts_with("steam linux runtime")
        || lower == "steamworks common redistributables"
}

fn steam_cdn_cover(appid: &str) -> String {
    format!("https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900.jpg")
}

pub fn find_steam_root_with_override(custom_root: Option<&str>) -> Option<PathBuf> {
    if let Some(c) = custom_root.map(str::trim).filter(|s| !s.is_empty()) {
        let pb = PathBuf::from(c);
        if pb.join("steamapps/libraryfolders.vdf").exists() || pb.exists() {
            return Some(pb);
        }
    }
    find_steam_root()
}

pub fn find_steam_root() -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    #[cfg(windows)]
    {
        if let Ok(out) = std::process::Command::new("reg")
            .args(["query", r"HKCU\Software\Valve\Steam", "/v", "SteamPath"])
            .output()
        {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                if line.contains("SteamPath") {
                    if let Some(path_part) = line.split("REG_SZ").nth(1) {
                        candidates.push(PathBuf::from(path_part.trim()));
                    }
                }
            }
        }
        candidates.push(PathBuf::from(r"C:\Program Files (x86)\Steam"));
        candidates.push(PathBuf::from(r"C:\Program Files\Steam"));
        candidates.push(PathBuf::from(r"D:\Steam"));
    }

    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join(".local/share/Steam"));
        candidates.push(home.join(".steam/steam"));
        candidates.push(home.join(".var/app/com.valvesoftware.Steam/.local/share/Steam"));
    }

    candidates
        .into_iter()
        .find(|p| p.join("steamapps/libraryfolders.vdf").exists())
}

pub fn detect_steam_id64(steam_root: &Path) -> Option<String> {
    let raw = fs::read_to_string(steam_root.join("config/loginusers.vdf")).ok()?;
    let mut first_id: Option<String> = None;
    let mut current_id: Option<String> = None;

    for line in raw.lines() {
        let trimmed = line.trim();
        let tokens = extract_quoted_tokens(trimmed);
        if tokens.len() == 1 {
            let candidate = &tokens[0];
            if candidate.len() == 17 && candidate.chars().all(|c| c.is_ascii_digit()) {
                if first_id.is_none() {
                    first_id = Some(candidate.clone());
                }
                current_id = Some(candidate.clone());
            }
        } else if tokens.len() >= 2
            && tokens[0].eq_ignore_ascii_case("MostRecent")
            && tokens[1] == "1"
        {
            if let Some(id) = current_id {
                return Some(id);
            }
        }
    }
    first_id
}

fn extract_quoted_tokens(line: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut chars = line.chars();
    while let Some(c) = chars.next() {
        if c == '"' {
            let mut buf = String::new();
            while let Some(nc) = chars.next() {
                if nc == '\\' {
                    if let Some(esc) = chars.next() {
                        buf.push(esc);
                    }
                } else if nc == '"' {
                    break;
                } else {
                    buf.push(nc);
                }
            }
            out.push(buf);
        }
    }
    out
}

fn resolve_local_steam_media(steam_root: &Path, appid: &str) -> (Option<String>, Option<String>) {
    let cache = steam_root.join("appcache/librarycache");
    let app_dir = cache.join(appid);

    let mut cover: Option<PathBuf> = None;
    let mut hero: Option<PathBuf> = None;

    for name in ["library_600x900.jpg", "library_capsule.jpg"] {
        let p = app_dir.join(name);
        if p.exists() {
            cover = Some(p);
            break;
        }
    }
    for name in ["library_hero.jpg", "header.jpg"] {
        let h = app_dir.join(name);
        if h.exists() {
            hero = Some(h);
            break;
        }
    }
    if cover.is_none() {
        let flat = cache.join(format!("{appid}_library_600x900.jpg"));
        if flat.exists() {
            cover = Some(flat);
        }
    }

    if let Ok(entries) = fs::read_dir(&app_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if cover.is_none() {
                    for name in ["library_capsule.jpg", "library_600x900.jpg"] {
                        let c = path.join(name);
                        if c.exists() {
                            cover = Some(c);
                            break;
                        }
                    }
                }
                if hero.is_none() {
                    for name in ["library_hero.jpg", "library_header.jpg"] {
                        let h = path.join(name);
                        if h.exists() {
                            hero = Some(h);
                            break;
                        }
                    }
                }
            }
            if cover.is_some() && hero.is_some() {
                break;
            }
        }
    }

    (
        cover.map(|p| p.to_string_lossy().into_owned()),
        hero.map(|p| p.to_string_lossy().into_owned()),
    )
}

fn parse_userdata_localconfigs(steam_root: &Path) -> HashMap<String, LocalUserAppStats> {
    let mut stats_map: HashMap<String, LocalUserAppStats> = HashMap::new();
    let userdata_dir = steam_root.join("userdata");
    let Ok(users) = fs::read_dir(userdata_dir) else {
        return stats_map;
    };

    for user_entry in users.flatten() {
        let cfg_path = user_entry.path().join("config/localconfig.vdf");
        let Ok(raw) = fs::read_to_string(&cfg_path) else {
            continue;
        };

        let mut depth: i32 = 0;
        let mut apps_depth: Option<i32> = None;
        let mut current_appid: Option<(String, i32)> = None;
        let mut pending_key: Option<String> = None;

        for line in raw.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            if trimmed == "{" {
                depth += 1;
                if let Some(k) = pending_key.take() {
                    if apps_depth.is_none() && k.eq_ignore_ascii_case("apps") {
                        apps_depth = Some(depth);
                    } else if apps_depth == Some(depth - 1)
                        && current_appid.is_none()
                        && k.chars().all(|c| c.is_ascii_digit())
                    {
                        stats_map.entry(k.clone()).or_default();
                        current_appid = Some((k, depth));
                    }
                }
                continue;
            }
            if trimmed == "}" {
                if let Some((_, app_d)) = &current_appid {
                    if depth == *app_d {
                        current_appid = None;
                    }
                }
                if apps_depth == Some(depth) {
                    apps_depth = None;
                }
                depth -= 1;
                pending_key = None;
                continue;
            }

            let tokens = extract_quoted_tokens(trimmed);
            if tokens.len() == 1 {
                pending_key = Some(tokens.into_iter().next().unwrap());
            } else if tokens.len() >= 2 {
                pending_key = None;
                if let Some((ref appid, app_d)) = current_appid {
                    if depth == app_d {
                        let k = &tokens[0];
                        let v = &tokens[1];
                        if k.eq_ignore_ascii_case("Playtime") {
                            if let Ok(mins) = v.parse::<u64>() {
                                let entry = stats_map.entry(appid.clone()).or_default();
                                if mins > entry.playtime_minutes {
                                    entry.playtime_minutes = mins;
                                }
                            }
                        } else if k.eq_ignore_ascii_case("LastPlayed") {
                            if let Ok(ts) = v.parse::<i64>() {
                                if ts > 0 {
                                    let entry = stats_map.entry(appid.clone()).or_default();
                                    if entry.last_played_epoch.unwrap_or(0) < ts {
                                        entry.last_played_epoch = Some(ts);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    stats_map
}

fn map_genre_ids(genre_ids: &[u32], tag_ids: &[u32]) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let mut push_unique = |label: &str| {
        if !out.iter().any(|x| x == label) {
            out.push(label.to_string());
        }
    };

    // Öncelikli niş etiketler (Shooter, Horror)
    for &tid in tag_ids {
        match tid {
            1774 | 1663 | 3814 => push_unique("Shooter"),
            1667 | 3978 | 1721 => push_unique("Horror"),
            _ => {}
        }
    }

    for &gid in genre_ids {
        match gid {
            1 => push_unique("Action"),
            25 => push_unique("Adventure"),
            3 => push_unique("RPG"),
            9 => push_unique("Racing"),
            2 => push_unique("Strategy"),
            28 => push_unique("Simulation"),
            18 => push_unique("Sports"),
            23 => push_unique("Indie"),
            _ => {}
        }
    }

    for &tid in tag_ids {
        match tid {
            19 => push_unique("Action"),
            21 => push_unique("Adventure"),
            122 => push_unique("RPG"),
            699 => push_unique("Racing"),
            9 => push_unique("Strategy"),
            599 => push_unique("Simulation"),
            _ => {}
        }
    }

    out
}

fn parse_appinfo_vdf_games(steam_root: &Path) -> HashMap<u32, ParsedSteamAppInfo> {
    let mut games = HashMap::new();
    let Ok(bytes) = fs::read(steam_root.join("appcache/appinfo.vdf")) else {
        return games;
    };
    if bytes.len() < 16 {
        return games;
    }

    let magic = u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
    let is_v29 = magic == 0x0756_4429;
    let is_v28 = magic == 0x0756_4428 || magic == 0x0756_4427;
    if !is_v29 && !is_v28 {
        return games;
    }

    let (entries_end, string_table) = if is_v29 {
        let str_off = i64::from_le_bytes(bytes[8..16].try_into().unwrap_or([0; 8])) as usize;
        if str_off == 0 || str_off + 4 > bytes.len() {
            return games;
        }
        let count = u32::from_le_bytes(bytes[str_off..str_off + 4].try_into().unwrap_or([0; 4]))
            as usize;
        let mut strings = Vec::with_capacity(count.min(65536));
        let mut pos = str_off + 4;
        for _ in 0..count {
            if pos >= bytes.len() {
                break;
            }
            let Some(rel_end) = bytes[pos..].iter().position(|&b| b == 0) else {
                break;
            };
            strings.push(String::from_utf8_lossy(&bytes[pos..pos + rel_end]).into_owned());
            pos += rel_end + 1;
        }
        (str_off, strings)
    } else {
        (bytes.len(), Vec::new())
    };

    let mut off = if is_v29 { 16 } else { 8 };
    while off + 8 <= entries_end {
        let appid = u32::from_le_bytes(bytes[off..off + 4].try_into().unwrap_or([0; 4]));
        if appid == 0 {
            break;
        }
        let size = u32::from_le_bytes(bytes[off + 4..off + 8].try_into().unwrap_or([0; 4])) as usize;
        let next_off = off + 8 + size;
        if next_off > entries_end || size < 60 {
            break;
        }
        let kv_slice = &bytes[off + 8 + 60..next_off];
        if let Some((name, app_type, genres)) =
            extract_common_details(kv_slice, is_v29, &string_table)
        {
            if app_type.eq_ignore_ascii_case("game") && !name.is_empty() {
                games.insert(appid, ParsedSteamAppInfo { name, genres });
            }
        }
        off = next_off;
    }

    games
}

fn extract_common_details(
    buf: &[u8],
    is_v29: bool,
    strings: &[String],
) -> Option<(String, String, Vec<String>)> {
    let mut idx = 0;
    let mut stack: Vec<String> = Vec::new();
    let mut found_name: Option<String> = None;
    let mut found_type: Option<String> = None;
    let mut genre_ids: Vec<u32> = Vec::new();
    let mut tag_ids: Vec<u32> = Vec::new();

    while idx < buf.len() {
        let t = buf[idx];
        idx += 1;
        if t == 8 {
            if stack.pop().as_deref() == Some("common") {
                break;
            }
            continue;
        }

        let key: &str = if is_v29 {
            if idx + 4 > buf.len() {
                break;
            }
            let k_idx = u32::from_le_bytes(buf[idx..idx + 4].try_into().ok()?) as usize;
            idx += 4;
            strings.get(k_idx).map(String::as_str).unwrap_or("")
        } else {
            let rel_end = buf[idx..].iter().position(|&b| b == 0)?;
            let s = std::str::from_utf8(&buf[idx..idx + rel_end]).unwrap_or("");
            idx += rel_end + 1;
            s
        };

        let in_common = stack.len() == 2
            && stack[0].eq_ignore_ascii_case("appinfo")
            && stack[1].eq_ignore_ascii_case("common");
        let in_genres = stack.len() == 3
            && stack[0].eq_ignore_ascii_case("appinfo")
            && stack[1].eq_ignore_ascii_case("common")
            && stack[2].eq_ignore_ascii_case("genres");
        let in_tags = stack.len() == 3
            && stack[0].eq_ignore_ascii_case("appinfo")
            && stack[1].eq_ignore_ascii_case("common")
            && stack[2].eq_ignore_ascii_case("store_tags");

        match t {
            0 => {
                stack.push(key.to_string());
            }
            1 => {
                let rel_end = buf[idx..].iter().position(|&b| b == 0)?;
                let val_str = String::from_utf8_lossy(&buf[idx..idx + rel_end]);
                if in_common {
                    if key.eq_ignore_ascii_case("name") && found_name.is_none() {
                        found_name = Some(val_str.into_owned());
                    } else if key.eq_ignore_ascii_case("type") && found_type.is_none() {
                        found_type = Some(val_str.into_owned());
                    }
                } else if in_genres {
                    if let Ok(n) = val_str.parse::<u32>() {
                        genre_ids.push(n);
                    }
                } else if in_tags && tag_ids.len() < 12 {
                    if let Ok(n) = val_str.parse::<u32>() {
                        tag_ids.push(n);
                    }
                }
                idx += rel_end + 1;
            }
            2..=6 => {
                if idx + 4 > buf.len() {
                    break;
                }
                let n = u32::from_le_bytes(buf[idx..idx + 4].try_into().ok()?);
                if in_genres {
                    genre_ids.push(n);
                } else if in_tags && tag_ids.len() < 12 {
                    tag_ids.push(n);
                }
                idx += 4;
            }
            7 | 10 => {
                if idx + 8 > buf.len() {
                    break;
                }
                idx += 8;
            }
            _ => break,
        }
    }

    Some((found_name?, found_type?, map_genre_ids(&genre_ids, &tag_ids)))
}

pub fn scan_steam_installed(steam_root: &Path) -> HashMap<String, UnifiedGame> {
    let mut installed = HashMap::new();
    let vdf_path = steam_root.join("steamapps/libraryfolders.vdf");
    let Ok(vdf_raw) = fs::read_to_string(&vdf_path) else {
        return installed;
    };

    let mut library_paths: Vec<PathBuf> = vec![steam_root.to_path_buf()];
    if let Ok(parsed) = keyvalues_serde::from_str::<LibraryFoldersRoot>(&vdf_raw) {
        for val in parsed.folders.values() {
            if let Some(p) = val.get("path").and_then(|v| v.as_str()) {
                let pb = PathBuf::from(p);
                if !library_paths.contains(&pb) {
                    library_paths.push(pb);
                }
            }
        }
    }

    for lib_root in library_paths {
        let steamapps = lib_root.join("steamapps");
        let Ok(entries) = fs::read_dir(&steamapps) else {
            continue;
        };

        for file in entries.flatten() {
            let fname = file.file_name();
            let fname_str = fname.to_string_lossy();
            if !fname_str.starts_with("appmanifest_") || !fname_str.ends_with(".acf") {
                continue;
            }
            let Ok(acf_raw) = fs::read_to_string(file.path()) else {
                continue;
            };
            let Ok(manifest) = keyvalues_serde::from_str::<AppManifest>(&acf_raw) else {
                continue;
            };

            if is_ignored_runtime(&manifest.appid, &manifest.name) {
                continue;
            }

            let flags: u32 = manifest.state_flags.parse().unwrap_or(0);
            let is_ready = (flags & 4) != 0;
            let (cover, hero) = resolve_local_steam_media(steam_root, &manifest.appid);
            let install_path = steamapps.join("common").join(&manifest.installdir);
            let cdn_fallback = Some(steam_cdn_cover(&manifest.appid));

            installed.insert(
                manifest.appid.clone(),
                UnifiedGame {
                    id: format!("steam:{}", manifest.appid),
                    platform_id: manifest.appid.clone(),
                    platform: Platform::Steam,
                    title: manifest.name,
                    status: if is_ready {
                        InstallStatus::Installed
                    } else {
                        InstallStatus::Cloud
                    },
                    install_path: Some(install_path),
                    size_bytes: manifest.size_on_disk.and_then(|s| s.parse().ok()),
                    playtime_minutes: 0,
                    last_played_epoch: manifest
                        .last_played
                        .and_then(|s| s.parse::<i64>().ok())
                        .filter(|&ts| ts > 0),
                    cover_path_or_url: cover.or_else(|| cdn_fallback.clone()),
                    fallback_cover_url: cdn_fallback,
                    hero_path_or_url: hero,
                    genres: Vec::new(),
                    developer: None,
                    store_slug: None,
                    summary_hint: None,
                    is_favorite: false,
                    is_hidden: false,
                    collection_tag: None,
                    update_available: None,
                    launch: Some(LaunchConfig {
                        command_uri_or_bin: format!("steam://rungameid/{}", manifest.appid),
                        args: vec![],
                        working_dir: None,
                        wine_prefix: None,
                    }),
                    install_uri: Some(format!("steam://install/{}", manifest.appid)),
                },
            );
        }
    }
    installed
}

pub async fn scan_steam_all(
    api_key: Option<&str>,
    steam_id_override: Option<&str>,
    custom_root: Option<&str>,
) -> Vec<UnifiedGame> {
    let Some(steam_root) = find_steam_root_with_override(custom_root) else {
        return vec![];
    };

    let root_clone = steam_root.clone();
    let mut map = tokio::task::spawn_blocking(move || {
        let mut games_map = scan_steam_installed(&root_clone);
        let local_stats = parse_userdata_localconfigs(&root_clone);
        let appinfo_games = parse_appinfo_vdf_games(&root_clone);

        for (appid, game) in games_map.iter_mut() {
            if let Some(st) = local_stats.get(appid) {
                if st.playtime_minutes > game.playtime_minutes {
                    game.playtime_minutes = st.playtime_minutes;
                }
                if game.last_played_epoch.is_none() {
                    game.last_played_epoch = st.last_played_epoch;
                }
            }
            if let Ok(num) = appid.parse::<u32>() {
                if let Some(info) = appinfo_games.get(&num) {
                    game.genres = info.genres.clone();
                }
            }
        }

        let mut candidate_ids: HashSet<u32> = HashSet::new();
        if let Ok(cache_entries) = fs::read_dir(root_clone.join("appcache/librarycache")) {
            for e in cache_entries.flatten() {
                if let Ok(id) = e.file_name().to_string_lossy().parse::<u32>() {
                    candidate_ids.insert(id);
                }
            }
        }
        for k in local_stats.keys() {
            if let Ok(id) = k.parse::<u32>() {
                candidate_ids.insert(id);
            }
        }

        for appid_num in candidate_ids {
            let appid_str = appid_num.to_string();
            if games_map.contains_key(&appid_str) {
                continue;
            }
            let Some(info) = appinfo_games.get(&appid_num) else {
                continue;
            };
            if is_ignored_runtime(&appid_str, &info.name) {
                continue;
            }
            let (cover, hero) = resolve_local_steam_media(&root_clone, &appid_str);
            let cdn_fallback = Some(steam_cdn_cover(&appid_str));
            let st = local_stats.get(&appid_str);

            games_map.insert(
                appid_str.clone(),
                UnifiedGame {
                    id: format!("steam:{appid_str}"),
                    platform_id: appid_str.clone(),
                    platform: Platform::Steam,
                    title: info.name.clone(),
                    status: InstallStatus::Cloud,
                    install_path: None,
                    size_bytes: None,
                    playtime_minutes: st.map(|s| s.playtime_minutes).unwrap_or(0),
                    last_played_epoch: st.and_then(|s| s.last_played_epoch),
                    cover_path_or_url: cover.or_else(|| cdn_fallback.clone()),
                    fallback_cover_url: cdn_fallback,
                    hero_path_or_url: hero,
                    genres: info.genres.clone(),
                    developer: None,
                    store_slug: None,
                    summary_hint: None,
                    is_favorite: false,
                    is_hidden: false,
                    collection_tag: None,
                    update_available: None,
                    launch: None,
                    install_uri: Some(format!("steam://install/{appid_str}")),
                },
            );
        }

        games_map
    })
    .await
    .unwrap_or_default();

    let clean_key = api_key.map(str::trim).filter(|k| !k.is_empty());
    let resolved_steam_id = steam_id_override
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToOwned::to_owned)
        .or_else(|| detect_steam_id64(&steam_root));

    if let (Some(key), Some(steam_id)) = (clean_key, resolved_steam_id) {
        let url = format!(
            "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key={key}&steamid={steam_id}&include_appinfo=1&include_played_free_games=1"
        );
        if let Ok(resp) = reqwest::get(&url).await {
            if let Ok(body) = resp.json::<OwnedGamesResponse>().await {
                for g in body.response.games.unwrap_or_default() {
                    let appid_str = g.appid.to_string();
                    let title = g.name.unwrap_or_else(|| format!("Steam App {appid_str}"));
                    if is_ignored_runtime(&appid_str, &title) {
                        continue;
                    }
                    let (cover, hero) = resolve_local_steam_media(&steam_root, &appid_str);
                    let cdn_fallback = Some(steam_cdn_cover(&appid_str));
                    map.entry(appid_str.clone())
                        .and_modify(|existing| {
                            if let Some(pt) = g.playtime_forever {
                                if pt > existing.playtime_minutes {
                                    existing.playtime_minutes = pt;
                                }
                            }
                            if existing.last_played_epoch.is_none() {
                                existing.last_played_epoch =
                                    g.rtime_last_played.filter(|&ts| ts > 0);
                            }
                        })
                        .or_insert_with(|| UnifiedGame {
                            id: format!("steam:{appid_str}"),
                            platform_id: appid_str.clone(),
                            platform: Platform::Steam,
                            title,
                            status: InstallStatus::Cloud,
                            install_path: None,
                            size_bytes: None,
                            playtime_minutes: g.playtime_forever.unwrap_or(0),
                            last_played_epoch: g.rtime_last_played.filter(|&ts| ts > 0),
                            cover_path_or_url: cover.or_else(|| cdn_fallback.clone()),
                            fallback_cover_url: cdn_fallback,
                            hero_path_or_url: hero,
                            genres: Vec::new(),
                            developer: None,
                            store_slug: None,
                            summary_hint: None,
                            is_favorite: false,
                            is_hidden: false,
                            collection_tag: None,
                            update_available: None,
                            launch: None,
                            install_uri: Some(format!("steam://install/{appid_str}")),
                        });
                }
            }
        }
    }

    map.into_values().collect()
}
