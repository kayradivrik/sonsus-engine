//! Sistem Tepsisi (System Tray) ve Sağ Tık Hızlı Başlat Menüsü (`tray.rs`).

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

pub fn setup_system_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let mut menu_builder = MenuBuilder::new(app);

    // Başlık
    let title_item = MenuItemBuilder::with_id("sonsus_title", "sonsus-engine").enabled(false).build(app)?;
    menu_builder = menu_builder.item(&title_item);
    menu_builder = menu_builder.item(&PredefinedMenuItem::separator(app)?);

    // Son Oynanan 3 Oyun (Hızlı Başlat)
    let games = crate::db::load_cached_games().unwrap_or_default();
    let mut sorted_recent = games
        .into_iter()
        .filter(|g| g.last_played_epoch.unwrap_or(0) > 0)
        .collect::<Vec<_>>();
    sorted_recent.sort_by(|a, b| {
        b.last_played_epoch
            .unwrap_or(0)
            .cmp(&a.last_played_epoch.unwrap_or(0))
    });

    let top3 = sorted_recent.into_iter().take(3).collect::<Vec<_>>();
    if !top3.is_empty() {
        for g in &top3 {
            let item_id = format!("launch_{}", g.id);
            let label = format!("▶ {}", g.title);
            let item = MenuItemBuilder::with_id(&item_id, &label).build(app)?;
            menu_builder = menu_builder.item(&item);
        }
        menu_builder = menu_builder.item(&PredefinedMenuItem::separator(app)?);
    }

    // Performans Modu (Aç/Kapat)
    let boost_item = MenuItemBuilder::with_id("boost_toggle", "⚡ Performans Modu (Geçiş Yap)").build(app)?;
    menu_builder = menu_builder.item(&boost_item);

    // Pencereyi Göster
    let show_item = MenuItemBuilder::with_id("show", "Pencereyi Göster").build(app)?;
    menu_builder = menu_builder.item(&show_item);
    menu_builder = menu_builder.item(&PredefinedMenuItem::separator(app)?);

    // Çıkış
    let quit_item = MenuItemBuilder::with_id("quit", "Tamamen Çıkış").build(app)?;
    menu_builder = menu_builder.item(&quit_item);

    let menu = menu_builder.build()?;

    let tray_icon = app.default_window_icon().cloned();
    let mut builder = TrayIconBuilder::new()
        .tooltip("sonsus-engine // E-Spor & Game Hub");
    if let Some(icon) = tray_icon {
        builder = builder.icon(icon);
    }
    let _tray = builder
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let id = event.id.as_ref();
            if id.starts_with("launch_") {
                let game_id = id.trim_start_matches("launch_");
                let _ = app.emit("tray-launch-game", game_id);
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            } else {
                match id {
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                    "boost_toggle" => {
                        let status = crate::optimizer::inspect_ultra_perf_status();
                        if status.current_governor == "performance" {
                            crate::optimizer::deactivate_extreme_boost(&[]);
                            crate::platform_os::send_desktop_notification(
                                "sonsus-engine",
                                "Dengeli güç moduna dönüldü.",
                            );
                        } else {
                            let _ = crate::optimizer::activate_extreme_boost(false);
                            crate::platform_os::send_desktop_notification(
                                "sonsus-engine",
                                "⚡ Performans modu devrede! (Maksimum saat hızı)",
                            );
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                }
            }
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
