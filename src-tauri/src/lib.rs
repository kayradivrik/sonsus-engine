pub mod commands;
pub mod covers;
pub mod db;
pub mod downloader;
pub mod installer;
pub mod launcher;
pub mod metadata;
pub mod models;
pub mod parsers;
pub mod platform_os;
pub mod protocol;

use commands::{
    fetch_game_cover, get_active_downloads, get_app_settings, get_cached_library,
    get_game_hook_profile, get_install_locations, get_online_game_details, get_system_diagnostics,
    install_game, launch_game, open_game_folder, pause_game_download, pick_folder,
    remove_download_task, scan_all_libraries, set_game_hook_profile, start_game_download,
    update_app_settings, AppState,
};
use db::load_settings;
use downloader::DownloadManager;
use protocol::handle_local_media_request;
use std::sync::{Arc, Mutex};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_settings = load_settings();

    tauri::Builder::default()
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
            open_game_folder,
            get_online_game_details,
            fetch_game_cover,
            get_app_settings,
            update_app_settings,
            get_game_hook_profile,
            set_game_hook_profile,
            get_system_diagnostics,
        ])
        .run(tauri::generate_context!())
        .expect("sonsus-engine başlatılırken hata oluştu");
}
