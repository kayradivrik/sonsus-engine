use crate::{
    models::{InstallStatus, LaunchConfig, Platform, UnifiedGame},
    parsers::epic::find_heroic_roots,
};
use rusqlite::Connection;
use serde::Deserialize;
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

#[derive(Debug, Deserialize)]
struct HeroicGogLibrary {
    #[serde(default)]
    games: Vec<HeroicGogGame>,
}

#[derive(Debug, Deserialize)]
struct HeroicGogGame {
    app_name: String,
    title: String,
    art_square: Option<String>,
    art_cover: Option<String>,
    #[serde(default)]
    is_dlc: bool,
}

#[derive(Debug, Deserialize)]
struct HeroicGogInstalledRoot {
    #[serde(default)]
    installed: Vec<HeroicGogInstalled>,
}

#[derive(Debug, Deserialize)]
struct HeroicGogInstalled {
    #[serde(rename = "appName")]
    app_name: String,
    install_path: String,
}

#[derive(Debug, Deserialize)]
struct GogGameInfoJson {
    #[serde(rename = "gameId")]
    game_id: Option<String>,
    name: Option<String>,
    #[serde(rename = "playTasks", default)]
    play_tasks: Vec<GogPlayTask>,
}

#[derive(Debug, Deserialize)]
struct GogPlayTask {
    #[serde(rename = "isPrimary", default)]
    is_primary: bool,
    path: Option<String>,
}

pub fn find_lutris_db() -> Option<PathBuf> {
    if let Some(data_dir) = dirs::data_local_dir() {
        let p = data_dir.join("lutris/pga.db");
        if p.exists() {
            return Some(p);
        }
    }
    if let Some(home) = dirs::home_dir() {
        let flatpak = home.join(".var/app/net.lutris.Lutris/data/lutris/pga.db");
        if flatpak.exists() {
            return Some(flatpak);
        }
    }
    None
}

pub fn scan_gog_all() -> Vec<UnifiedGame> {
    let mut games: HashMap<String, UnifiedGame> = HashMap::new();

    for hr in find_heroic_roots() {
        let lib_path = hr.join("store_cache/gog_library.json");
        if let Ok(raw) = fs::read_to_string(&lib_path) {
            if let Ok(lib) = serde_json::from_str::<HeroicGogLibrary>(&raw) {
                for g in lib.games.into_iter().filter(|x| !x.is_dlc) {
                    let cover = g.art_square.clone().or_else(|| g.art_cover.clone());
                    games.insert(
                        g.app_name.clone(),
                        UnifiedGame {
                            id: format!("gog:{}", g.app_name),
                            platform_id: g.app_name.clone(),
                            platform: Platform::Gog,
                            title: g.title,
                            status: InstallStatus::Cloud,
                            install_path: None,
                            size_bytes: None,
                            playtime_minutes: 0,
                            last_played_epoch: None,
                            cover_path_or_url: cover.clone(),
                            fallback_cover_url: cover,
                            hero_path_or_url: g.art_cover,
                            genres: Vec::new(),
                            launch: None,
                            install_uri: Some(format!("heroic://launch/gog/{}", g.app_name)),
                        },
                    );
                }
            }
        }

        let inst_path = hr.join("gog_store/installed.json");
        if let Ok(raw) = fs::read_to_string(&inst_path) {
            if let Ok(inst_root) = serde_json::from_str::<HeroicGogInstalledRoot>(&raw) {
                for inst in inst_root.installed {
                    let pb = PathBuf::from(&inst.install_path);
                    let launch_cfg = LaunchConfig {
                        command_uri_or_bin: format!("heroic://launch/gog/{}", inst.app_name),
                        args: vec![],
                        working_dir: Some(pb.clone()),
                        wine_prefix: None,
                    };
                    games
                        .entry(inst.app_name.clone())
                        .and_modify(|entry| {
                            entry.status = InstallStatus::Installed;
                            entry.install_path = Some(pb.clone());
                            entry.launch = Some(launch_cfg.clone());
                        })
                        .or_insert(UnifiedGame {
                            id: format!("gog:{}", inst.app_name),
                            platform_id: inst.app_name.clone(),
                            platform: Platform::Gog,
                            title: pb
                                .file_name()
                                .map(|s| s.to_string_lossy().into_owned())
                                .unwrap_or_else(|| inst.app_name.clone()),
                            status: InstallStatus::Installed,
                            install_path: Some(pb),
                            size_bytes: None,
                            playtime_minutes: 0,
                            last_played_epoch: None,
                            cover_path_or_url: None,
                            fallback_cover_url: None,
                            hero_path_or_url: None,
                            genres: Vec::new(),
                            launch: Some(launch_cfg),
                            install_uri: Some(format!("heroic://launch/gog/{}", inst.app_name)),
                        });
                }
            }
        }
    }

    if let Some(pga_db) = find_lutris_db() {
        if let Ok(conn) = Connection::open(&pga_db) {
            if let Ok(mut stmt) =
                conn.prepare("SELECT appid, name FROM service_games WHERE service = 'gog'")
            {
                if let Ok(rows) = stmt.query_map([], |r| {
                    Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
                }) {
                    for (gog_id, title) in rows.flatten() {
                        games.entry(gog_id.clone()).or_insert(UnifiedGame {
                            id: format!("gog:{gog_id}"),
                            platform_id: gog_id.clone(),
                            platform: Platform::Gog,
                            title,
                            status: InstallStatus::Cloud,
                            install_path: None,
                            size_bytes: None,
                            playtime_minutes: 0,
                            last_played_epoch: None,
                            cover_path_or_url: None,
                            fallback_cover_url: None,
                            hero_path_or_url: None,
                            genres: Vec::new(),
                            launch: None,
                            install_uri: Some(format!("lutris:gog:{gog_id}")),
                        });
                    }
                }
            }

            if let Ok(mut stmt) = conn.prepare(
                "SELECT id, service_id, name, directory, installed, playtime, lastplayed
                 FROM games WHERE service = 'gog'",
            ) {
                let _ = stmt
                    .query_map([], |r| {
                        let lutris_id: i64 = r.get(0)?;
                        let gog_id: String = r
                            .get::<_, Option<String>>(1)?
                            .unwrap_or_else(|| lutris_id.to_string());
                        let title: String = r.get(2)?;
                        let dir: Option<String> = r.get(3)?;
                        let installed: i64 = r.get::<_, Option<i64>>(4)?.unwrap_or(0);
                        let playtime_hrs: f64 = r.get::<_, Option<f64>>(5)?.unwrap_or(0.0);
                        let last_played: Option<i64> = r.get(6)?;

                        let is_inst = installed == 1;
                        let entry = games.entry(gog_id.clone()).or_insert(UnifiedGame {
                            id: format!("gog:{gog_id}"),
                            platform_id: gog_id.clone(),
                            platform: Platform::Gog,
                            title,
                            status: if is_inst {
                                InstallStatus::Installed
                            } else {
                                InstallStatus::Cloud
                            },
                            install_path: dir.as_ref().map(PathBuf::from),
                            size_bytes: None,
                            playtime_minutes: (playtime_hrs * 60.0) as u64,
                            last_played_epoch: last_played.filter(|&ts| ts > 0),
                            cover_path_or_url: None,
                            fallback_cover_url: None,
                            hero_path_or_url: None,
                            genres: Vec::new(),
                            launch: None,
                            install_uri: Some(format!("lutris:gog:{gog_id}")),
                        });
                        if is_inst {
                            entry.status = InstallStatus::Installed;
                            entry.install_path = dir.as_ref().map(PathBuf::from);
                            entry.launch = Some(LaunchConfig {
                                command_uri_or_bin: format!("lutris:rungameid/{lutris_id}"),
                                args: vec![],
                                working_dir: None,
                                wine_prefix: None,
                            });
                        }
                        Ok(())
                    })
                    .map(|iter| iter.for_each(drop));
            }
        }
    }

    if let Some(home) = dirs::home_dir() {
        scan_native_gog_dir(&home.join("GOG Games"), &mut games);
        scan_gog_manifests_recursive(&home.join("Games"), 3, &mut games);
    }

    games.into_values().collect()
}

fn scan_native_gog_dir(dir: &Path, games: &mut HashMap<String, UnifiedGame>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let game_dir = entry.path();
        let gameinfo = game_dir.join("gameinfo");
        let start_sh = game_dir.join("start.sh");
        let Ok(raw) = fs::read_to_string(&gameinfo) else {
            continue;
        };
        let lines: Vec<&str> = raw.lines().collect();
        if lines.len() >= 5 {
            let title = lines[0].trim().to_string();
            let gog_id = lines[4].trim().to_string();
            games.insert(
                gog_id.clone(),
                UnifiedGame {
                    id: format!("gog:{gog_id}"),
                    platform_id: gog_id,
                    platform: Platform::Gog,
                    title,
                    status: InstallStatus::Installed,
                    install_path: Some(game_dir.clone()),
                    size_bytes: None,
                    playtime_minutes: 0,
                    last_played_epoch: None,
                    cover_path_or_url: None,
                    fallback_cover_url: None,
                    hero_path_or_url: None,
                    genres: Vec::new(),
                    launch: Some(LaunchConfig {
                        command_uri_or_bin: start_sh.to_string_lossy().into_owned(),
                        args: vec![],
                        working_dir: Some(game_dir),
                        wine_prefix: None,
                    }),
                    install_uri: None,
                },
            );
        }
    }
}

fn scan_gog_manifests_recursive(
    dir: &Path,
    depth: u8,
    games: &mut HashMap<String, UnifiedGame>,
) {
    if depth == 0 || !dir.exists() {
        return;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            scan_gog_manifests_recursive(&path, depth - 1, games);
        } else if let Some(fname) = path.file_name().and_then(|s| s.to_str()) {
            if fname.starts_with("goggame-") && fname.ends_with(".info") {
                let Ok(raw) = fs::read_to_string(&path) else {
                    continue;
                };
                let Ok(info) = serde_json::from_str::<GogGameInfoJson>(&raw) else {
                    continue;
                };
                let Some(gog_id) = info.game_id else {
                    continue;
                };
                if games
                    .get(&gog_id)
                    .map(|g| g.status == InstallStatus::Installed)
                    .unwrap_or(false)
                {
                    continue;
                }
                let parent = path.parent().unwrap_or(dir).to_path_buf();
                let title = info.name.unwrap_or_else(|| {
                    parent
                        .file_name()
                        .map(|s| s.to_string_lossy().into_owned())
                        .unwrap_or_else(|| gog_id.clone())
                });
                let exe_rel = info
                    .play_tasks
                    .iter()
                    .find(|t| t.is_primary)
                    .or_else(|| info.play_tasks.first())
                    .and_then(|t| t.path.clone());

                let launch = exe_rel.map(|rel| {
                    let exe_full = parent.join(rel.replace('\\', "/"));
                    LaunchConfig {
                        command_uri_or_bin: "wine".into(),
                        args: vec![exe_full.to_string_lossy().into_owned()],
                        working_dir: Some(parent.clone()),
                        wine_prefix: None,
                    }
                });

                games.insert(
                    gog_id.clone(),
                    UnifiedGame {
                        id: format!("gog:{gog_id}"),
                        platform_id: gog_id,
                        platform: Platform::Gog,
                        title,
                        status: InstallStatus::Installed,
                        install_path: Some(parent),
                        size_bytes: None,
                        playtime_minutes: 0,
                        last_played_epoch: None,
                        cover_path_or_url: None,
                        fallback_cover_url: None,
                        hero_path_or_url: None,
                        genres: Vec::new(),
                        launch,
                        install_uri: None,
                    },
                );
            }
        }
    }
}
