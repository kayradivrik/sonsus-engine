use crate::{
    covers::resolve_or_fetch_cover,
    db::{
        load_cached_games, load_game_hook, save_cached_games, save_game_hook, save_settings,
        update_single_cached_game,
    },
    downloader::DownloadManager,
    installer::{execute_install_action, list_install_locations, open_in_file_manager},
    launcher::{enumerate_displays, launch_with_hooks},
    metadata::fetch_online_game_details,
    models::{
        AppSettings, DownloadTaskInfo, HookProfile, InstallGamePayload, InstallLocationOption,
        OnlineGameDetails, SystemDiagnostics, UnifiedGame,
    },
    parsers::{
        epic::{find_heroic_roots, scan_epic_all},
        gog::{find_lutris_db, scan_gog_all},
        steam::{detect_steam_id64, find_steam_root_with_override, scan_steam_all},
    },
    platform_os::{detect_session_label, has_binary, pick_directory_dialog},
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
    all.extend(epic_games?);
    all.extend(gog_games.map_err(|e| e.to_string())?);

    all.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    let _ = save_cached_games(&all);

    Ok(all)
}

#[tauri::command]
pub async fn launch_game(
    app: AppHandle,
    mut game: UnifiedGame,
    hook_override: Option<HookProfile>,
    state: State<'_, AppState>,
) -> Result<UnifiedGame, String> {
    let hook = hook_override
        .or_else(|| load_game_hook(&game.id))
        .unwrap_or_else(|| state.settings.lock().unwrap().default_hook.clone());

    let game_id = game.id.clone();
    let _ = app.emit("game-started", &game_id);

    let res = launch_with_hooks(game.clone(), hook).await;
    let _ = app.emit("game-exited", &game_id);

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
pub fn open_game_folder(path: String) -> Result<(), String> {
    open_in_file_manager(&path)
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
        displays: enumerate_displays(),
    }
}
