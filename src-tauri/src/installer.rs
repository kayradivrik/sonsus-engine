//! Oyun kurulum yöneticisi, disk boş alan sorgulayıcı ve mevcut oyun klasörü bağlayıcı.

use crate::{
    db::update_single_cached_game,
    launcher::has_binary,
    models::{
        InstallGamePayload, InstallLocationOption, InstallStatus, LaunchConfig, Platform,
        UnifiedGame,
    },
    parsers::steam::find_steam_root,
};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

#[cfg(unix)]
fn query_disk_space(path: &Path) -> (u64, u64) {
    let mut probe = path.to_path_buf();
    while !probe.exists() {
        let Some(parent) = probe.parent() else {
            return (0, 0);
        };
        probe = parent.to_path_buf();
    }
    if let Ok(stat) = nix::sys::statvfs::statvfs(&probe) {
        let bsize = stat.fragment_size() as u64;
        let free = (stat.blocks_available() as u64).saturating_mul(bsize);
        let total = (stat.blocks() as u64).saturating_mul(bsize);
        return (free, total);
    }
    (0, 0)
}

#[cfg(not(unix))]
fn query_disk_space(_path: &Path) -> (u64, u64) {
    (0, 0)
}

pub fn list_install_locations(custom_default_dir: Option<&str>) -> Vec<InstallLocationOption> {
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
        let heroic_games = home.join("Games/Heroic");
        if heroic_games.exists() && !candidates.iter().any(|(_, p)| p == &heroic_games) {
            candidates.push(("Heroic Kütüphanesi (~/Games/Heroic)".into(), heroic_games));
        }
    }

    if let Some(steam_root) = find_steam_root() {
        let common = steam_root.join("steamapps/common");
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

fn find_legendary_binary() -> Option<String> {
    if has_binary("legendary") {
        return Some("legendary".into());
    }
    let heroic_bundled = "/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/legendary";
    if Path::new(heroic_bundled).exists() {
        return Some(heroic_bundled.into());
    }
    None
}

fn spawn_in_terminal(shell_cmd: &str) -> Result<(), String> {
    let terminals: &[(&str, &[&str])] = &[
        ("konsole", &["--hold", "-e", "bash", "-c"]),
        ("kitty", &["--hold", "bash", "-c"]),
        ("alacritty", &["--hold", "-e", "bash", "-c"]),
        ("xfce4-terminal", &["--hold", "-e"]),
        ("gnome-terminal", &["--", "bash", "-c"]),
        ("xterm", &["-hold", "-e", "bash", "-c"]),
    ];

    for (bin, args) in terminals {
        if has_binary(bin) {
            let mut cmd = Command::new(bin);
            cmd.args(*args);
            cmd.arg(shell_cmd);
            cmd.spawn()
                .map_err(|e| format!("Terminal başlatılamadı ({bin}): {e}"))?;
            return Ok(());
        }
    }
    Err(
        "Sistemde desteklenen bir terminal öykünücüsü (konsole, kitty, alacritty vb.) bulunamadı."
            .into(),
    )
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
                Platform::Epic => LaunchConfig {
                    command_uri_or_bin: format!("heroic://launch/legendary/{}", game.platform_id),
                    args: vec![],
                    working_dir: Some(pb),
                    wine_prefix: None,
                },
                Platform::Gog => LaunchConfig {
                    command_uri_or_bin: format!("heroic://launch/gog/{}", game.platform_id),
                    args: vec![],
                    working_dir: Some(pb),
                    wine_prefix: None,
                },
            });

            update_single_cached_game(&game)?;
            Ok(game)
        }

        "legendary_cli" => {
            let bin = find_legendary_binary()
                .ok_or_else(|| "Sistemde Legendary ikilisi bulunamadı.".to_string())?;
            let target_dir = payload.target_dir.unwrap_or_else(|| {
                dirs::home_dir()
                    .unwrap_or_else(|| PathBuf::from("/tmp"))
                    .join("Games")
                    .to_string_lossy()
                    .into_owned()
            });
            let _ = fs::create_dir_all(&target_dir);

            let mut env_prefix = String::new();
            if let Some(cfg) = dirs::config_dir() {
                let heroic_xdg = cfg.join("heroic/legendaryConfig");
                if heroic_xdg.exists() && !cfg.join("legendary/user.json").exists() {
                    env_prefix = format!(
                        "XDG_CONFIG_HOME='{}' ",
                        heroic_xdg.to_string_lossy()
                    );
                }
            }

            let script = format!(
                "{env_prefix}'{bin}' install '{}' --base-path '{}' -y; echo ''; echo '[TAMAMLANDI] Pencereyi kapatıp kütüphaneyi yenileyebilirsiniz.'",
                game.platform_id, target_dir
            );
            spawn_in_terminal(&script)?;
            Ok(game)
        }

        _ => {
            match game.platform {
                Platform::Steam => {
                    let uri = format!("steam://install/{}", game.platform_id);
                    if Path::new("/usr/bin/steam").exists() {
                        Command::new("/usr/bin/steam")
                            .arg(&uri)
                            .spawn()
                            .map_err(|e| e.to_string())?;
                    } else {
                        Command::new("xdg-open")
                            .arg(&uri)
                            .spawn()
                            .map_err(|e| e.to_string())?;
                    }
                }
                Platform::Epic | Platform::Gog => {
                    if Path::new("/opt/Heroic/heroic").exists() {
                        Command::new("/opt/Heroic/heroic")
                            .spawn()
                            .map_err(|e| e.to_string())?;
                    } else if has_binary("heroic") {
                        Command::new("heroic")
                            .spawn()
                            .map_err(|e| e.to_string())?;
                    } else if let Some(uri) = game.install_uri.as_deref() {
                        Command::new("xdg-open")
                            .arg(uri)
                            .spawn()
                            .map_err(|e| e.to_string())?;
                    } else {
                        return Err("Heroic veya uyumlu mağaza istemcisi bulunamadı.".into());
                    }
                }
            }
            Ok(game)
        }
    }
}

pub fn open_in_file_manager(path: &str) -> Result<(), String> {
    let pb = PathBuf::from(path);
    if !pb.exists() {
        return Err(format!("Klasör bulunamadı: {path}"));
    }
    Command::new("xdg-open")
        .arg(&pb)
        .spawn()
        .map_err(|e| format!("Dosya yöneticisi açılamadı: {e}"))?;
    Ok(())
}
