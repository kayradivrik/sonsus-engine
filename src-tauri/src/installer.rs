//! Oyun kurulum yöneticisi, kaldırma (uninstall), güncelleme kontrolü,
//! çapraz platform disk boş alan sorgulayıcı ve özel oyun ekleyici.

use crate::{
    db::{delete_custom_game, save_custom_game, update_single_cached_game},
    models::{
        CustomGameInput, InstallGamePayload, InstallLocationOption, InstallStatus, LaunchConfig,
        Platform, UnifiedGame,
    },
    parsers::{epic::find_legendary_binary_path, steam::find_steam_root_with_override},
    platform_os::{has_binary, open_path_in_explorer, open_uri_scheme, query_disk_space},
};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

pub fn list_install_locations(
    custom_default_dir: Option<&str>,
    custom_steam_root: Option<&str>,
) -> Vec<InstallLocationOption> {
    let mut candidates: Vec<(String, PathBuf)> = Vec::new();

    if let Some(custom) = custom_default_dir.map(str::trim).filter(|s| !s.is_empty()) {
        candidates.push((
            "Ayarlardaki Varsayılan Kurulum Dizini".into(),
            PathBuf::from(custom),
        ));
    }

    if let Some(home) = dirs::home_dir() {
        let games_dir = home.join("Games");
        if !candidates.iter().any(|(_, p)| p == &games_dir) {
            candidates.push(("Ana Oyun Klasörü (~/Games)".into(), games_dir));
        }
        let heroic_games = home.join("Games").join("Heroic");
        if heroic_games.exists() && !candidates.iter().any(|(_, p)| p == &heroic_games) {
            candidates.push(("Heroic Kütüphanesi (~/Games/Heroic)".into(), heroic_games));
        }
    }

    #[cfg(windows)]
    {
        for (drv, label) in [
            (r"C:\Games", r"Yerel Disk Oyun Klasörü (C:\Games)"),
            (r"D:\Games", r"İkincil Disk Oyun Klasörü (D:\Games)"),
        ] {
            let root_drive = &drv[..3];
            if Path::new(root_drive).exists() {
                let pb = PathBuf::from(drv);
                if !candidates.iter().any(|(_, p)| p == &pb) {
                    candidates.push((label.into(), pb));
                }
            }
        }
    }

    if let Some(steam_root) = find_steam_root_with_override(custom_steam_root) {
        let common = steam_root.join("steamapps").join("common");
        if common.exists() && !candidates.iter().any(|(_, p)| p == &common) {
            candidates.push(("Steam Kütüphanesi (steamapps/common)".into(), common));
        }
    }

    let mut out = Vec::new();
    for (label, pb) in candidates {
        let (free_bytes, total_bytes) = query_disk_space(&pb);
        out.push(InstallLocationOption {
            label,
            path: pb.to_string_lossy().into_owned(),
            free_bytes,
            total_bytes,
        });
    }
    out
}

fn compute_dir_size_bounded(dir: &Path, depth: u8) -> u64 {
    if depth == 0 || !dir.exists() {
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
                total = total.saturating_add(compute_dir_size_bounded(&entry.path(), depth - 1));
            }
        }
    }
    total
}

pub fn create_custom_game(input: CustomGameInput) -> Result<UnifiedGame, String> {
    let title = input.title.trim().to_string();
    if title.is_empty() {
        return Err("Lütfen oyun için bir başlık girin.".into());
    }
    let exe_str = input.executable_path.trim().to_string();
    let exe_pb = PathBuf::from(&exe_str);
    if !exe_pb.exists() {
        return Err(format!("Çalıştırılabilir dosya bulunamadı: {exe_str}"));
    }

    let parent_dir = input
        .working_dir
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(PathBuf::from)
        .or_else(|| exe_pb.parent().map(Path::to_path_buf));

    let prefix_pb = input
        .wine_prefix
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(PathBuf::from);

    // Benzersiz deterministik kimlik üret
    let mut hash: u64 = 14695981039346656037;
    for b in exe_str.as_bytes() {
        hash ^= *b as u64;
        hash = hash.wrapping_mul(1099511628211);
    }
    let slug_id = format!("{hash:016x}");

    let is_win_exe = exe_str.to_lowercase().ends_with(".exe");
    let (cmd_bin, cmd_args) = {
        #[cfg(not(windows))]
        {
            if is_win_exe {
                let mut a = vec![exe_str.clone()];
                a.extend(input.args);
                ("wine".to_string(), a)
            } else {
                (exe_str.clone(), input.args)
            }
        }
        #[cfg(windows)]
        {
            let _ = is_win_exe;
            (exe_str.clone(), input.args)
        }
    };

    let size_bytes = parent_dir
        .as_deref()
        .map(|d| compute_dir_size_bounded(d, 2))
        .filter(|&s| s > 0);

    let game = UnifiedGame {
        id: format!("custom:{slug_id}"),
        platform_id: slug_id,
        platform: Platform::Custom,
        title,
        status: InstallStatus::Installed,
        install_path: parent_dir.clone(),
        size_bytes,
        playtime_minutes: 0,
        last_played_epoch: None,
        cover_path_or_url: None,
        fallback_cover_url: None,
        hero_path_or_url: None,
        genres: vec!["Özel Oyun".into()],
        developer: Some("Yerel Kurulum".into()),
        store_slug: None,
        summary_hint: Some(format!("Yerel yürütülebilir oyun dosyası: {exe_str}")),
        is_favorite: false,
        is_hidden: false,
        collection_tag: None,
        update_available: None,
        launch: Some(LaunchConfig {
            command_uri_or_bin: cmd_bin,
            args: cmd_args,
            working_dir: parent_dir,
            wine_prefix: prefix_pb,
        }),
        install_uri: None,
    };

    save_custom_game(&game)?;
    update_single_cached_game(&game)?;
    Ok(game)
}

pub fn uninstall_installed_game(mut game: UnifiedGame) -> Result<UnifiedGame, String> {
    match game.platform {
        Platform::Custom => {
            delete_custom_game(&game.id)?;
            game.status = InstallStatus::Cloud;
            return Ok(game);
        }
        Platform::Steam => {
            open_uri_scheme(&format!("steam://uninstall/{}", game.platform_id))?;
            return Ok(game);
        }
        Platform::Epic => {
            let bin = find_legendary_binary_path().ok_or_else(|| {
                "Epic oyunu kaldırmak için sistemde Legendary motoru bulunamadı.".to_string()
            })?;
            let mut cmd = Command::new(&bin);
            cmd.args(["-y", "uninstall", &game.platform_id]);
            if let Some(cfg) = dirs::config_dir() {
                let heroic_xdg = cfg.join("heroic/legendaryConfig");
                if heroic_xdg.exists() && !cfg.join("legendary/user.json").exists() {
                    cmd.env("XDG_CONFIG_HOME", &heroic_xdg);
                    cmd.env("LEGENDARY_CONFIG_PATH", heroic_xdg.join("legendary"));
                }
            }
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                cmd.creation_flags(0x0800_0000);
            }
            let out = cmd
                .output()
                .map_err(|e| format!("Kaldırma komutu çalıştırılamadı: {e}"))?;
            if !out.status.success() {
                // Eğer Legendary veritabanında kayıtlı değil ama klasörü bağlıysa yine de temizle
                if let Some(ref p) = game.install_path {
                    if p.exists() && p.components().count() >= 4 {
                        let _ = fs::remove_dir_all(p);
                    }
                }
            }
            game.status = InstallStatus::Cloud;
            game.install_path = None;
            game.launch = None;
            update_single_cached_game(&game)?;
            Ok(game)
        }
        Platform::Gog => {
            if let Some(ref p) = game.install_path {
                if p.exists() && p.components().count() >= 4 {
                    fs::remove_dir_all(p)
                        .map_err(|e| format!("Oyun klasörü silinemedi ({}): {e}", p.display()))?;
                }
            }
            game.status = InstallStatus::Cloud;
            game.install_path = None;
            game.launch = None;
            update_single_cached_game(&game)?;
            Ok(game)
        }
    }
}

pub fn check_single_game_update(game: &UnifiedGame) -> Result<bool, String> {
    if game.status != InstallStatus::Installed {
        return Ok(false);
    }
    match game.platform {
        Platform::Epic => {
            let Some(bin) = find_legendary_binary_path() else {
                return Ok(false);
            };
            let mut cmd = Command::new(bin);
            cmd.args(["list-installed", "--check-updates", "--json"]);
            if let Some(cfg) = dirs::config_dir() {
                let heroic_xdg = cfg.join("heroic/legendaryConfig");
                if heroic_xdg.exists() && !cfg.join("legendary/user.json").exists() {
                    cmd.env("XDG_CONFIG_HOME", &heroic_xdg);
                    cmd.env("LEGENDARY_CONFIG_PATH", heroic_xdg.join("legendary"));
                }
            }
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                cmd.creation_flags(0x0800_0000);
            }
            let out = cmd.output().map_err(|e| e.to_string())?;
            if let Ok(arr) = serde_json::from_slice::<Vec<serde_json::Value>>(&out.stdout) {
                for item in arr {
                    if item.get("app_name").and_then(|v| v.as_str())
                        == Some(game.platform_id.as_str())
                    {
                        let has_upd = item
                            .get("has_update")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);
                        return Ok(has_upd);
                    }
                }
            }
            Ok(false)
        }
        _ => Ok(false),
    }
}

pub fn execute_install_action(payload: InstallGamePayload) -> Result<UnifiedGame, String> {
    let mut game = payload.game;

    match payload.mode.as_str() {
        "locate" => {
            let raw_dir = payload
                .target_dir
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .ok_or_else(|| "Lütfen geçerli bir oyun klasörü yolu girin.".to_string())?;

            let pb = PathBuf::from(raw_dir);
            if !pb.exists() || !pb.is_dir() {
                return Err(format!("Belirtilen klasör bulunamadı: {raw_dir}"));
            }

            let size = compute_dir_size_bounded(&pb, 4);
            game.status = InstallStatus::Installed;
            game.install_path = Some(pb.clone());
            if size > 0 {
                game.size_bytes = Some(size);
            }
            game.launch = Some(match game.platform {
                Platform::Steam => LaunchConfig {
                    command_uri_or_bin: format!("steam://rungameid/{}", game.platform_id),
                    args: vec![],
                    working_dir: Some(pb),
                    wine_prefix: None,
                },
                Platform::Epic => {
                    if let Some(leg_bin) = find_legendary_binary_path() {
                        LaunchConfig {
                            command_uri_or_bin: leg_bin,
                            args: vec!["launch".into(), game.platform_id.clone()],
                            working_dir: Some(pb),
                            wine_prefix: None,
                        }
                    } else {
                        LaunchConfig {
                            command_uri_or_bin: format!(
                                "heroic://launch/legendary/{}",
                                game.platform_id
                            ),
                            args: vec![],
                            working_dir: Some(pb),
                            wine_prefix: None,
                        }
                    }
                }
                Platform::Gog => LaunchConfig {
                    command_uri_or_bin: format!("heroic://launch/gog/{}", game.platform_id),
                    args: vec![],
                    working_dir: Some(pb),
                    wine_prefix: None,
                },
                Platform::Custom => game.launch.clone().unwrap_or(LaunchConfig {
                    command_uri_or_bin: pb.to_string_lossy().into_owned(),
                    args: vec![],
                    working_dir: Some(pb),
                    wine_prefix: None,
                }),
            });

            update_single_cached_game(&game)?;
            Ok(game)
        }

        _ => {
            match game.platform {
                Platform::Steam => {
                    let uri = format!("steam://install/{}", game.platform_id);
                    #[cfg(unix)]
                    if Path::new("/usr/bin/steam").exists() {
                        Command::new("/usr/bin/steam")
                            .arg(&uri)
                            .spawn()
                            .map_err(|e| e.to_string())?;
                        return Ok(game);
                    }
                    open_uri_scheme(&uri)?;
                }
                Platform::Epic | Platform::Gog => {
                    #[cfg(unix)]
                    {
                        if Path::new("/opt/Heroic/heroic").exists() {
                            Command::new("/opt/Heroic/heroic")
                                .spawn()
                                .map_err(|e| e.to_string())?;
                            return Ok(game);
                        } else if has_binary("heroic") {
                            Command::new("heroic")
                                .spawn()
                                .map_err(|e| e.to_string())?;
                            return Ok(game);
                        }
                    }

                    #[cfg(windows)]
                    {
                        let mut win_heroic_paths =
                            vec![PathBuf::from(r"C:\Program Files\Heroic\Heroic.exe")];
                        if let Ok(local_app) = std::env::var("LOCALAPPDATA") {
                            win_heroic_paths.push(
                                PathBuf::from(local_app).join(r"Programs\heroic\Heroic.exe"),
                            );
                        }
                        for hp in win_heroic_paths {
                            if hp.exists() {
                                Command::new(hp).spawn().map_err(|e| e.to_string())?;
                                return Ok(game);
                            }
                        }
                    }

                    if let Some(uri) = game.install_uri.as_deref() {
                        open_uri_scheme(uri)?;
                    } else if game.platform == Platform::Epic {
                        open_uri_scheme("com.epicgames.launcher://store")?;
                    } else {
                        return Err("Heroic veya uyumlu mağaza istemcisi bulunamadı.".into());
                    }
                }
                Platform::Custom => {}
            }
            Ok(game)
        }
    }
}

pub fn open_in_file_manager(path: &str) -> Result<(), String> {
    open_path_in_explorer(Path::new(path))
}
