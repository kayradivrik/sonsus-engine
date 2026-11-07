//! Sistem Tepsisi (System Tray) ve Masaüstü Bildirimleri (`tray.rs`).

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn setup_system_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_item = MenuItemBuilder::with_id("show", "Sonsus Engine'i Göster").build(app)?;
    let boost_item = MenuItemBuilder::with_id("boost", "⚡ Ultra E-Spor FPS Modunu Aç").build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "Tamamen Çıkış Yap").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&show_item, &boost_item, &quit_item])
        .build()?;

    let _tray = TrayIconBuilder::new()
        .tooltip("sonsus-engine // E-Spor & Game Hub")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            }
            "boost" => {
                let _ = crate::optimizer::activate_extreme_boost(false);
                let _ = crate::platform_os::send_desktop_notification(
                    "sonsus-engine",
                    "⚡ E-Spor Ultra Boost modu devreye alındı! (4.7 GHz + RTX 4050)",
                );
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

