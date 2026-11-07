pub mod commands;
pub mod covers;
pub mod db;
pub mod installer;
pub mod launcher;
pub mod metadata;
pub mod models;
pub mod parsers;
pub mod protocol;

use commands::{
    fetch_game_cover, get_app_settings, get_cached_library, get_game_hook_profile,
    get_install_locations, get_online_game_details, get_system_diagnostics, install_game,
    launch_game, open_game_folder, scan_all_libraries, set_game_hook_profile, update_app_settings,
    AppState,
};
use db::load_settings;
use protocol::handle_krnlmedia_request;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_settings = load_settings();

    tauri::Builder::default()
        .register_asynchronous_uri_scheme_protocol("krnlmedia", |_ctx, request, responder| {
            handle_krnlmedia_request(request, responder);
        })
        .manage(AppState {
            settings: Mutex::new(initial_settings),
        })
        .invoke_handler(tauri::generate_handler![
            get_cached_library,
            scan_all_libraries,
            launch_game,
            get_install_locations,
            install_game,
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
        .expect("KRNL Launcher başlatılırken hata oluştu");
}
