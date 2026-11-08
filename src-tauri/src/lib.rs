pub mod auth;
pub mod commands;
pub mod covers;
pub mod db;
pub mod deals;
pub mod downloader;
pub mod installer;
pub mod launcher;
pub mod logs_store;
pub mod metadata;
pub mod models;
pub mod optimizer;
pub mod parsers;
pub mod platform_os;
pub mod protocol;
pub mod runners_mgr;
pub mod saves;
pub mod tray;

use commands::{
    add_custom_game, apply_steam_esports_preset_command, check_game_update,
    clear_launch_logs, connect_epic_account, connect_gog_account, create_game_save_backup,
    disconnect_epic_account, disconnect_gog_account, fetch_game_cover, get_active_downloads,
    get_app_settings, get_cached_library, get_curated_deals, get_game_hook_profile,
    get_game_save_backups, get_install_locations, get_launch_logs, get_oauth_login_urls,
    get_online_game_details, get_store_auth_status, get_system_diagnostics, get_ultra_perf_status,
    install_boost_helper, install_game, install_ge_proton, launch_game, list_remote_ge_proton,
    open_external_url, open_game_folder, pause_game_download, pick_executable, pick_folder,
    remove_download_task, restore_game_save_backup, scan_all_libraries, set_game_hook_profile,
    set_game_preferences, start_game_download, stop_extreme_boost_now, sync_game_cloud_saves,
    trigger_extreme_boost_now, uninstall_game, update_app_settings, verify_or_repair_game,
    AppState,
};
use db::load_settings;
use downloader::DownloadManager;
use protocol::handle_local_media_request;
use std::sync::{Arc, Mutex};
use tauri::{Manager, WindowEvent};
use tray::setup_system_tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_settings = load_settings();

    tauri::Builder::default()
        .setup(|app| {
            let _ = setup_system_tray(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                let state = app.state::<AppState>();
                let should_minimize = state.settings.lock().unwrap().minimize_to_tray;
                let has_downloads = !state.downloads.list_tasks().is_empty();

                if should_minimize || has_downloads {
                    api.prevent_close();
                    let _ = window.hide();
                    let _ = crate::platform_os::send_desktop_notification(
                        "sonsus-engine",
                        "Uygulama arka planda sistem tepsisinde çalışmaya devam ediyor.",
                    );
                }
            }
        })
        .register_asynchronous_uri_scheme_protocol("sonsusmedia", |_ctx, request, responder| {
            handle_local_media_request(request, responder);
        })
        .register_asynchronous_uri_scheme_protocol("krnlmedia", |_ctx, request, responder| {
            handle_local_media_request(request, responder);
        })
        .manage(AppState {
            settings: Mutex::new(initial_settings),
            downloads: Arc::new(DownloadManager::default()),
        })
        .invoke_handler(tauri::generate_handler![
            get_cached_library,
            scan_all_libraries,
            launch_game,
            get_install_locations,
            install_game,
            start_game_download,
            pause_game_download,
            remove_download_task,
            get_active_downloads,
            pick_folder,
            pick_executable,
            open_game_folder,
            open_external_url,
            get_online_game_details,
            fetch_game_cover,
            get_app_settings,
            update_app_settings,
            get_game_hook_profile,
            set_game_hook_profile,
            get_system_diagnostics,
            get_store_auth_status,
            get_oauth_login_urls,
            connect_epic_account,
            disconnect_epic_account,
            connect_gog_account,
            disconnect_gog_account,
            set_game_preferences,
            add_custom_game,
            uninstall_game,
            verify_or_repair_game,
            check_game_update,
            get_ultra_perf_status,
            install_boost_helper,
            trigger_extreme_boost_now,
            stop_extreme_boost_now,
            apply_steam_esports_preset_command,
            list_remote_ge_proton,
            install_ge_proton,
            sync_game_cloud_saves,
            create_game_save_backup,
            get_game_save_backups,
            restore_game_save_backup,
            get_launch_logs,
            clear_launch_logs,
            get_curated_deals,
        ])
        .run(tauri::generate_context!())
        .expect("sonsus-engine başlatılırken hata oluştu");
}
