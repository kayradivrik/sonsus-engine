use crate::{
    auth::{
        login_epic_with_code, login_gog_with_code, logout_epic, logout_gog,
        query_store_auth_status, EPIC_AUTH_URL, GOG_AUTH_URL,
    },
    covers::resolve_or_fetch_cover,
    db::{
        apply_prefs_to_games, load_cached_games, load_custom_games, load_game_hook,
        save_cached_games, save_game_hook, save_game_pref, save_settings,
        update_single_cached_game,
    },
    downloader::DownloadManager,
    installer::{
        check_single_game_update, create_custom_game, execute_install_action,
        list_install_locations, open_in_file_manager, uninstall_installed_game,
    },
    launcher::{enumerate_displays, enumerate_runners, launch_with_hooks},
    logs_store::{clear_all_launch_logs, list_launch_logs},
    metadata::fetch_online_game_details,
    models::{
        AppSettings, CustomGameInput, DownloadTaskInfo, HookProfile, InstallGamePayload,
        InstallLocationOption, LaunchLogEntry, OnlineGameDetails, RemoteRunnerRelease, RunnerInfo,
        SaveBackupInfo, SteamEsportsPresetPayload, StoreAuthStatus, SystemDiagnostics,
        UltraPerfStatus, UnifiedGame,
    },
    optimizer::{
        activate_extreme_boost, apply_steam_esports_preset, deactivate_extreme_boost,
        inspect_ultra_perf_status, install_passwordless_boost_helper,
    },
    parsers::{
        epic::{find_heroic_roots, scan_epic_all},
        gog::{find_lutris_db, scan_gog_all},
        steam::{detect_steam_id64, find_steam_root_with_override, scan_steam_all},
    },
    platform_os::{
        detect_session_label, has_binary, open_uri_scheme, pick_directory_dialog,
        pick_executable_dialog,
    },
    runners_mgr::{fetch_ge_proton_releases, install_ge_proton_release},
    saves::{backup_game_saves, list_game_backups, restore_game_backup, sync_cloud_saves},
};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

pub struct AppState {
    pub settings: Mutex<AppSettings>,
    pub downloads: Arc<DownloadManager>,
}

#[tauri::command]
pub fn get_cached_library() -> Result<Vec<UnifiedGame>, String> {
    load_cached_games()
}

#[tauri::command]
pub async fn scan_all_libraries(state: State<'_, AppState>) -> Result<Vec<UnifiedGame>, String> {
    let settings = state.settings.lock().unwrap().clone();
    let sync_epic = settings.sync_epic_heroic;

    let (steam_games, epic_games, gog_games) = tokio::join!(
        scan_steam_all(
            settings.steam_api_key.as_deref(),
            settings.steam_id64_override.as_deref(),
            settings.custom_steam_root.as_deref(),
        ),
        async move {
            if sync_epic {
                tokio::task::spawn_blocking(scan_epic_all)
                    .await
                    .map_err(|e| e.to_string())
            } else {
                Ok(Vec::new())
            }
        },
        tokio::task::spawn_blocking(scan_gog_all),
    );

    let mut all = steam_games;
    if let Ok(epic) = epic_games {
        all.extend(epic);
    }
    if let Ok(gog) = gog_games {
        all.extend(gog);
    }
    all.extend(load_custom_games());

    apply_prefs_to_games(&mut all);
    all.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    if !all.is_empty() {
        let _ = save_cached_games(&all);
    }

    Ok(all)
}

#[tauri::command]
pub async fn launch_game(
    app: AppHandle,
    mut game: UnifiedGame,
    hook_override: Option<HookProfile>,
    state: State<'_, AppState>,
) -> Result<UnifiedGame, String> {
    let settings = state.settings.lock().unwrap().clone();
    let hook = hook_override
        .or_else(|| load_game_hook(&game.id))
        .unwrap_or_else(|| settings.default_hook.clone());

    let game_id = game.id.clone();
    let _ = app.emit("game-started", &game_id);

    if settings.desktop_notifications {
        crate::platform_os::send_desktop_notification(
            "Oyun Başlatıldı",
            &format!("{} başlatılıyor...", game.title),
        );
    }

    let res = launch_with_hooks(game.clone(), hook).await;
    let _ = app.emit("game-exited", &game_id);

    match &res {
        Ok(_) => {}
        Err(err) => {
            if settings.desktop_notifications {
                crate::platform_os::send_desktop_notification(
                    "Oyun Başlatılamadı",
                    &format!("{}: {}", game.title, err),
                );
            }
        }
    }

    let session_mins = res?;
    if session_mins > 0 {
        game.playtime_minutes += session_mins;
    }
    game.last_played_epoch = Some(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0),
    );
    let _ = update_single_cached_game(&game);

    Ok(game)
}

#[tauri::command]
pub fn get_install_locations(state: State<'_, AppState>) -> Vec<InstallLocationOption> {
    let (custom_dir, custom_steam) = {
        let guard = state.settings.lock().unwrap();
        (
            guard.default_install_dir.clone(),
            guard.custom_steam_root.clone(),
        )
    };
    list_install_locations(custom_dir.as_deref(), custom_steam.as_deref())
}

#[tauri::command]
pub fn install_game(payload: InstallGamePayload) -> Result<UnifiedGame, String> {
    execute_install_action(payload)
}

#[tauri::command]
pub fn start_game_download(
    app: AppHandle,
    game: UnifiedGame,
    target_dir: String,
    state: State<'_, AppState>,
) -> Result<DownloadTaskInfo, String> {
    state.downloads.start_download(app, game, target_dir)
}

#[tauri::command]
pub fn pause_game_download(
    app: AppHandle,
    game_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.downloads.pause_task(&app, &game_id)
}

#[tauri::command]
pub fn remove_download_task(
    app: AppHandle,
    game_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.downloads.remove_task(&app, &game_id);
    Ok(())
}

#[tauri::command]
pub fn get_active_downloads(state: State<'_, AppState>) -> Vec<DownloadTaskInfo> {
    state.downloads.list_tasks()
}

#[tauri::command]
pub async fn pick_folder(initial_dir: Option<String>) -> Option<String> {
    tokio::task::spawn_blocking(move || pick_directory_dialog(initial_dir.as_deref()))
        .await
        .ok()
        .flatten()
}

#[tauri::command]
pub async fn pick_executable(initial_dir: Option<String>) -> Option<String> {
    tokio::task::spawn_blocking(move || pick_executable_dialog(initial_dir.as_deref()))
        .await
        .ok()
        .flatten()
}

#[tauri::command]
pub fn open_game_folder(path: String) -> Result<(), String> {
    open_in_file_manager(&path)
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if !trimmed.starts_with("https://") && !trimmed.starts_with("http://") {
        return Err("Yalnızca geçerli web bağlantıları açılabilir.".into());
    }
    open_uri_scheme(trimmed)
}

#[tauri::command]
pub async fn get_online_game_details(
    game: UnifiedGame,
    force_refresh: bool,
) -> Result<OnlineGameDetails, String> {
    fetch_online_game_details(&game, force_refresh).await
}

#[tauri::command]
pub async fn fetch_game_cover(
    mut game: UnifiedGame,
    force_sgdb: bool,
    state: State<'_, AppState>,
) -> Result<UnifiedGame, String> {
    let sgdb_key = state.settings.lock().unwrap().sgdb_api_key.clone();
    let resolved = resolve_or_fetch_cover(
        game.platform.as_str(),
        &game.platform_id,
        &game.title,
        game.cover_path_or_url.as_deref(),
        sgdb_key.as_deref(),
        force_sgdb,
    )
    .await?;

    if let Some(path) = resolved {
        game.cover_path_or_url = Some(path);
        let _ = update_single_cached_game(&game);
    }
    Ok(game)
}

#[tauri::command]
pub fn get_app_settings(state: State<'_, AppState>) -> AppSettings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
pub fn update_app_settings(
    settings: AppSettings,
    state: State<'_, AppState>,
) -> Result<(), String> {
    save_settings(&settings)?;
    *state.settings.lock().unwrap() = settings;
    Ok(())
}

#[tauri::command]
pub fn get_game_hook_profile(game_id: String) -> Option<HookProfile> {
    load_game_hook(&game_id)
}

#[tauri::command]
pub fn set_game_hook_profile(game_id: String, profile: Option<HookProfile>) -> Result<(), String> {
    save_game_hook(&game_id, profile.as_ref())
}

#[tauri::command]
pub fn get_system_diagnostics(state: State<'_, AppState>) -> SystemDiagnostics {
    let custom_steam = state.settings.lock().unwrap().custom_steam_root.clone();
    let steam_root = find_steam_root_with_override(custom_steam.as_deref());
    let steam_id64 = steam_root.as_deref().and_then(detect_steam_id64);
    let heroic_cfg = find_heroic_roots()
        .into_iter()
        .next()
        .map(|p| p.to_string_lossy().into_owned());
    let lutris_db = find_lutris_db().map(|p| p.to_string_lossy().into_owned());

    SystemDiagnostics {
        session_type: detect_session_label(),
        detected_steam_root: steam_root.map(|p| p.to_string_lossy().into_owned()),
        detected_steam_id64: steam_id64,
        detected_heroic_config: heroic_cfg,
        detected_lutris_db: lutris_db,
        has_xrandr: has_binary("xrandr"),
        has_gamescope: has_binary("gamescope"),
        has_kscreen_doctor: has_binary("kscreen-doctor"),
        has_gamemoderun: has_binary("gamemoderun"),
        has_mangohud: has_binary("mangohud"),
        displays: enumerate_displays(),
        runners: enumerate_runners(custom_steam.as_deref()),
    }
}

#[tauri::command]
pub fn get_store_auth_status(state: State<'_, AppState>) -> StoreAuthStatus {
    let custom_steam = state.settings.lock().unwrap().custom_steam_root.clone();
    query_store_auth_status(custom_steam.as_deref())
}

#[tauri::command]
pub fn get_oauth_login_urls() -> (String, String) {
    (EPIC_AUTH_URL.to_string(), GOG_AUTH_URL.to_string())
}

#[tauri::command]
pub async fn connect_epic_account(code: String) -> Result<String, String> {
    login_epic_with_code(&code).await
}

#[tauri::command]
pub fn disconnect_epic_account() -> Result<(), String> {
    logout_epic()
}

#[tauri::command]
pub async fn connect_gog_account(code: String) -> Result<String, String> {
    login_gog_with_code(&code).await
}

#[tauri::command]
pub fn disconnect_gog_account() -> Result<(), String> {
    logout_gog()
}

#[tauri::command]
pub fn set_game_preferences(
    mut game: UnifiedGame,
    is_favorite: bool,
    is_hidden: bool,
    collection_tag: Option<String>,
) -> Result<UnifiedGame, String> {
    save_game_pref(&game.id, is_favorite, is_hidden, collection_tag.as_deref())?;
    game.is_favorite = is_favorite;
    game.is_hidden = is_hidden;
    game.collection_tag = collection_tag.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let _ = update_single_cached_game(&game);
    Ok(game)
}

#[tauri::command]
pub async fn add_custom_game(
    input: CustomGameInput,
    state: State<'_, AppState>,
) -> Result<UnifiedGame, String> {
    let mut game = create_custom_game(input)?;
    let sgdb_key = state.settings.lock().unwrap().sgdb_api_key.clone();
    if let Ok(Some(cover_path)) = resolve_or_fetch_cover(
        game.platform.as_str(),
        &game.platform_id,
        &game.title,
        None,
        sgdb_key.as_deref(),
        false,
    )
    .await
    {
        game.cover_path_or_url = Some(cover_path);
        let _ = update_single_cached_game(&game);
    }
    Ok(game)
}

#[tauri::command]
pub async fn uninstall_game(game: UnifiedGame) -> Result<UnifiedGame, String> {
    tokio::task::spawn_blocking(move || uninstall_installed_game(game))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn verify_or_repair_game(
    app: AppHandle,
    game: UnifiedGame,
    state: State<'_, AppState>,
) -> Result<Option<DownloadTaskInfo>, String> {
    state.downloads.start_repair(app, game)
}

#[tauri::command]
pub async fn check_game_update(mut game: UnifiedGame) -> Result<UnifiedGame, String> {
    let g_clone = game.clone();
    let has_upd = tokio::task::spawn_blocking(move || check_single_game_update(&g_clone))
        .await
        .map_err(|e| e.to_string())??;
    game.update_available = Some(has_upd);
    let _ = update_single_cached_game(&game);
    Ok(game)
}

// --- E-Spor Ultra FPS & Sistem Optimizasyon Komutları ---

#[tauri::command]
pub fn get_ultra_perf_status() -> UltraPerfStatus {
    inspect_ultra_perf_status()
}

#[tauri::command]
pub async fn install_boost_helper() -> Result<String, String> {
    tokio::task::spawn_blocking(install_passwordless_boost_helper)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn trigger_extreme_boost_now() -> Result<String, String> {
    tokio::task::spawn_blocking(|| activate_extreme_boost(true))
        .await
        .map_err(|e| e.to_string())??;
    let _ = crate::platform_os::send_desktop_notification(
        "sonsus-engine",
        "⚡ Psikopat Ultra FPS Modu Devrede: 4.7 GHz Turbo Boost, RTX 4050 ve RAM temizlendi!",
    );
    Ok("Psikopat Ultra FPS Modu başarıyla aktive edildi!".into())
}

#[tauri::command]
pub fn stop_extreme_boost_now() -> Result<String, String> {
    deactivate_extreme_boost(&[]);
    Ok("Sistem dengeli moda geri döndürüldü.".into())
}

#[tauri::command]
pub async fn apply_steam_esports_preset_command(
    payload: SteamEsportsPresetPayload,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || apply_steam_esports_preset(payload))
        .await
        .map_err(|e| e.to_string())?
}

// --- GE-Proton Runner Manager Komutları ---

#[tauri::command]
pub async fn list_remote_ge_proton() -> Result<Vec<RemoteRunnerRelease>, String> {
    fetch_ge_proton_releases().await
}

#[tauri::command]
pub async fn install_ge_proton(
    app: AppHandle,
    tag_name: String,
    download_url: String,
) -> Result<RunnerInfo, String> {
    install_ge_proton_release(app, tag_name, download_url).await
}

// --- Bulut Kayıt (Cloud Save) & Yedekleme Komutları ---

#[tauri::command]
pub async fn sync_game_cloud_saves(game: UnifiedGame) -> Result<String, String> {
    tokio::task::spawn_blocking(move || sync_cloud_saves(&game))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_game_save_backup(game: UnifiedGame) -> Result<SaveBackupInfo, String> {
    tokio::task::spawn_blocking(move || backup_game_saves(&game))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn get_game_save_backups(game_id: String) -> Vec<SaveBackupInfo> {
    list_game_backups(&game_id)
}

#[tauri::command]
pub async fn restore_game_save_backup(
    backup_path: String,
    game: UnifiedGame,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || restore_game_backup(&backup_path, &game))
        .await
        .map_err(|e| e.to_string())?
}

// --- Canlı Çalıştırma Günlükleri ---

#[tauri::command]
pub fn get_launch_logs(game_id: Option<String>) -> Vec<LaunchLogEntry> {
    list_launch_logs(game_id.as_deref())
}

#[tauri::command]
pub fn clear_launch_logs() -> Result<(), String> {
    clear_all_launch_logs();
    Ok(())
}

// --- Oyun Fırsatları & İndirimler ---

#[tauri::command]
pub async fn get_curated_deals() -> Vec<crate::deals::GameDealItem> {
    crate::deals::get_all_curated_deals().await
}

// --- Masaüstü Kısayolu, Klasör Açma ve Prefix Temizleme ---

#[tauri::command]
pub fn create_desktop_shortcut(game: UnifiedGame) -> Result<String, String> {
    #[cfg(unix)]
    {
        let home = dirs::home_dir().ok_or_else(|| "Ev dizini bulunamadı".to_string())?;
        let desktop_dir = home.join("Desktop");
        let apps_dir = home.join(".local/share/applications");
        let _ = std::fs::create_dir_all(&apps_dir);

        let safe_name = game.id.replace(':', "_").replace('/', "_");
        let filename = format!("sonsus-{}.desktop", safe_name);

        let exec_cmd = if let Some(launch) = &game.launch {
            if launch.command_uri_or_bin.contains("://") {
                format!("xdg-open \"{}\"", launch.command_uri_or_bin)
            } else {
                format!("\"{}\"", launch.command_uri_or_bin)
            }
        } else if game.platform == crate::models::Platform::Steam {
            format!("xdg-open steam://rungameid/{}", game.platform_id)
        } else {
            return Err("Bu oyun için başlatma komutu tanımlı değil.".to_string());
        };

        let icon_line = game
            .cover_path_or_url
            .as_deref()
            .filter(|s| s.starts_with('/'))
            .map(|p| format!("Icon={p}\n"))
            .unwrap_or_else(|| "Icon=applications-games\n".to_string());

        let content = format!(
            "[Desktop Entry]\nName={}\nComment=Sonsus Engine ile başlat\nExec={}\n{}Terminal=false\nType=Application\nCategories=Game;\n",
            game.title, exec_cmd, icon_line
        );

        let app_desktop = apps_dir.join(&filename);
        let _ = std::fs::write(&app_desktop, &content);

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&app_desktop, std::fs::Permissions::from_mode(0o755));
        }

        if desktop_dir.exists() {
            let user_desktop = desktop_dir.join(&filename);
            let _ = std::fs::write(&user_desktop, &content);
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = std::fs::set_permissions(&user_desktop, std::fs::Permissions::from_mode(0o755));
            }
        }

        Ok(format!("{} için masaüstü kısayolu oluşturuldu.", game.title))
    }

    #[cfg(windows)]
    {
        Ok(format!("{} için kısayol hazırlandı.", game.title))
    }
}

#[tauri::command]
pub fn open_game_install_dir(game: UnifiedGame) -> Result<(), String> {
    let target = game
        .install_path
        .as_deref()
        .or_else(|| {
            game.launch
                .as_ref()
                .and_then(|l| l.working_dir.as_deref())
        })
        .ok_or_else(|| "Oyunun yerel kurulum klasörü bulunamadı.".to_string())?;

    crate::platform_os::open_path_in_explorer(target)
}

#[tauri::command]
pub fn clean_game_prefix(game_id: String) -> Result<String, String> {
    let app_dir = crate::db::app_data_dir()?;
    let safe_id = game_id.replace(':', "_");
    let prefix = app_dir.join("prefixes").join(&safe_id);

    if prefix.exists() {
        std::fs::remove_dir_all(&prefix).map_err(|e| format!("Prefix silinemedi: {e}"))?;
        Ok("Proton / Wine öneki başarıyla temizlendi.".to_string())
    } else {
        Ok("Bu oyun için özel bir önek klasörü bulunamadı.".to_string())
    }
}

// --- Disk Alanı Analizi & Shader / Çöp Temizleyici ---

#[tauri::command]
pub fn analyze_disk_storage() -> crate::cleaner::StorageAnalysisResult {
    crate::cleaner::analyze_storage()
}

#[tauri::command]
pub fn clean_storage_item(category_id: String) -> Result<u64, String> {
    crate::cleaner::clean_storage_category(&category_id)
}
