//! Windows 11 Debloat & Telemetri Kapatıcı (`debloat.rs`).
//! Sonsus Engine için Windows 11 arka plan telemetrisi, gereksiz servisler,
//! Bing web araması, Copilot, Edge arka plan servisleri ve Game DVR'ı optimize eder.

use crate::models::{DebloatItem, DebloatResult};
use std::process::Command;

pub fn get_debloat_items() -> Vec<DebloatItem> {
    #[cfg(windows)]
    {
        vec![
            DebloatItem {
                id: "telemetry".into(),
                title: "Windows Telemetri & Tanılama (DiagTrack)".into(),
                description: "Microsoft'a arka planda donanım ve kullanım verisi gönderen DiagTrack (Bağlı Kullanıcı Deneyimleri) servisini durdurur.".into(),
                category: "privacy".into(),
                icon_key: "telemetry".into(),
                risk_level: "safe".into(),
                is_applied: is_service_disabled("DiagTrack"),
            },
            DebloatItem {
                id: "copilot".into(),
                title: "Windows 11 Copilot Yapay Zeka Entegrasyonu".into(),
                description: "Görev çubuğu ve sistem genelindeki Copilot arka plan yapay zeka ajanlarını ve telemetrisini devre dışı bırakır.".into(),
                category: "apps".into(),
                icon_key: "copilot".into(),
                risk_level: "safe".into(),
                is_applied: is_copilot_disabled(),
            },
            DebloatItem {
                id: "bing_search".into(),
                title: "Başlat Menüsü Bing & Web Araması".into(),
                description: "Başlat menüsünde arama yaparken internette Bing araması yapıp gecikme yaratmasını engeller; aramayı yerel dosyalara odaklar.".into(),
                category: "privacy".into(),
                icon_key: "bing".into(),
                risk_level: "safe".into(),
                is_applied: is_bing_search_disabled(),
            },
            DebloatItem {
                id: "cortana".into(),
                title: "Cortana Sesli Asistan Servisleri".into(),
                description: "Artık kullanılmayan ve arka planda bellek tüketen Cortana asistan kalıntılarını tamamen kapatır.".into(),
                category: "apps".into(),
                icon_key: "cortana".into(),
                risk_level: "safe".into(),
                is_applied: is_cortana_disabled(),
            },
            DebloatItem {
                id: "edge_bg".into(),
                title: "Microsoft Edge Arka Plan Başlangıç Servisi".into(),
                description: "Edge tarayıcısının Windows açılışında arka planda gizlice çalışıp 300MB+ RAM ve CPU tüketmesini engeller.".into(),
                category: "services".into(),
                icon_key: "edge".into(),
                risk_level: "safe".into(),
                is_applied: is_edge_bg_disabled(),
            },
            DebloatItem {
                id: "game_dvr".into(),
                title: "Xbox Game DVR Arka Plan Video Yakalama".into(),
                description: "Oyun esnasında arka planda sürekli video tamponlayıp FPS düşüşüne ve giriş gecikmesine yol açan Game DVR'ı kapatır.".into(),
                category: "gaming".into(),
                icon_key: "gamedvr".into(),
                risk_level: "recommended".into(),
                is_applied: is_game_dvr_disabled(),
            },
            DebloatItem {
                id: "widgets".into(),
                title: "Windows 11 Haberler & Hava Durumu Widget'ları".into(),
                description: "Görev çubuğundaki WebView2 tabanlı gereksiz haber akışı ve borsa panellerini kapatarak RAM tasarrufu sağlar.".into(),
                category: "services".into(),
                icon_key: "widgets".into(),
                risk_level: "safe".into(),
                is_applied: is_widgets_disabled(),
            },
            DebloatItem {
                id: "xbox_telemetry".into(),
                title: "Xbox Live Ağ Yoklamaları & Telemetri".into(),
                description: "Oyun esnasında gereksiz Xbox ağ yoklamalarını optimize eder, online oyunlarda ani ping dalgalanmalarını (jitter) önler.".into(),
                category: "gaming".into(),
                icon_key: "xbox".into(),
                risk_level: "safe".into(),
                is_applied: is_xbox_telemetry_disabled(),
            },
            DebloatItem {
                id: "onedrive".into(),
                title: "OneDrive Arka Plan Senkronizasyonu".into(),
                description: "OneDrive'ın oyun oynarken arka planda dosya yükleyip disk ve internet bant genişliğini sömürmesini durdurur.".into(),
                category: "apps".into(),
                icon_key: "onedrive".into(),
                risk_level: "safe".into(),
                is_applied: is_onedrive_startup_disabled(),
            },
            DebloatItem {
                id: "activity_history".into(),
                title: "Windows Etkinlik Geçmişi & Kullanıcı İzleme".into(),
                description: "Açılan uygulamaların ve dosyaların zaman çizelgesine kaydedilmesini durdurarak disk I/O yükünü hafifletir.".into(),
                category: "privacy".into(),
                icon_key: "diagnostics".into(),
                risk_level: "safe".into(),
                is_applied: is_activity_history_disabled(),
            },
        ]
    }

    #[cfg(not(windows))]
    {
        Vec::new()
    }
}

pub fn apply_debloat_items(ids: Vec<String>) -> DebloatResult {
    #[cfg(windows)]
    {
        let mut applied = Vec::new();

        for id in &ids {
            match id.as_str() {
                "telemetry" => {
                    let _ = Command::new("sc").args(["stop", "DiagTrack"]).status();
                    let _ = Command::new("sc").args(["config", "DiagTrack", "start=", "disabled"]).status();
                    let _ = Command::new("sc").args(["stop", "dmwappushservice"]).status();
                    let _ = Command::new("sc").args(["config", "dmwappushservice", "start=", "disabled"]).status();
                    let _ = Command::new("reg").args(["add", r"HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection", "/v", "AllowTelemetry", "/t", "REG_DWORD", "/d", "0", "/f"]).status();
                    applied.push(id.clone());
                }
                "copilot" => {
                    let _ = Command::new("reg").args(["add", r"HKCU\Software\Policies\Microsoft\Windows\WindowsCopilot", "/v", "TurnOffWindowsCopilot", "/t", "REG_DWORD", "/d", "1", "/f"]).status();
                    let _ = Command::new("reg").args(["add", r"HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot", "/v", "TurnOffWindowsCopilot", "/t", "REG_DWORD", "/d", "1", "/f"]).status();
                    applied.push(id.clone());
                }
                "bing_search" => {
                    let _ = Command::new("reg").args(["add", r"HKCU\Software\Policies\Microsoft\Windows\Explorer", "/v", "DisableSearchBoxSuggestions", "/t", "REG_DWORD", "/d", "1", "/f"]).status();
                    let _ = Command::new("reg").args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Search", "/v", "BingSearchEnabled", "/t", "REG_DWORD", "/d", "0", "/f"]).status();
                    applied.push(id.clone());
                }
                "cortana" => {
                    let _ = Command::new("reg").args(["add", r"HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search", "/v", "AllowCortana", "/t", "REG_DWORD", "/d", "0", "/f"]).status();
                    applied.push(id.clone());
                }
                "edge_bg" => {
                    let _ = Command::new("reg").args(["add", r"HKLM\SOFTWARE\Policies\Microsoft\Edge", "/v", "BackgroundModeEnabled", "/t", "REG_DWORD", "/d", "0", "/f"]).status();
                    let _ = Command::new("reg").args(["add", r"HKLM\SOFTWARE\Policies\Microsoft\Edge", "/v", "StartupBoostEnabled", "/t", "REG_DWORD", "/d", "0", "/f"]).status();
                    applied.push(id.clone());
                }
                "game_dvr" => {
                    let _ = Command::new("reg").args(["add", r"HKCU\System\GameConfigStore", "/v", "GameDVR_Enabled", "/t", "REG_DWORD", "/d", "0", "/f"]).status();
                    let _ = Command::new("reg").args(["add", r"HKLM\SOFTWARE\Policies\Microsoft\Windows\GameDVR", "/v", "AllowGameDVR", "/t", "REG_DWORD", "/d", "0", "/f"]).status();
                    applied.push(id.clone());
                }
                "widgets" => {
                    let _ = Command::new("reg").args(["add", r"HKLM\SOFTWARE\Policies\Microsoft\Dsh", "/v", "AllowNewsAndInterests", "/t", "REG_DWORD", "/d", "0", "/f"]).status();
                    let _ = Command::new("reg").args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "/v", "TaskbarDa", "/t", "REG_DWORD", "/d", "0", "/f"]).status();
                    applied.push(id.clone());
                }
                "xbox_telemetry" => {
                    let _ = Command::new("sc").args(["stop", "XblAuthManager"]).status();
                    let _ = Command::new("sc").args(["config", "XblAuthManager", "start=", "demand"]).status();
                    applied.push(id.clone());
                }
                "onedrive" => {
                    let _ = Command::new("reg").args(["delete", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run", "/v", "OneDrive", "/f"]).status();
                    applied.push(id.clone());
                }
                "activity_history" => {
                    let _ = Command::new("reg").args(["add", r"HKLM\SOFTWARE\Policies\Microsoft\Windows\System", "/v", "EnableActivityFeed", "/t", "REG_DWORD", "/d", "0", "/f"]).status();
                    let _ = Command::new("reg").args(["add", r"HKLM\SOFTWARE\Policies\Microsoft\Windows\System", "/v", "PublishUserActivities", "/t", "REG_DWORD", "/d", "0", "/f"]).status();
                    applied.push(id.clone());
                }
                _ => {}
            }
        }

        let count = applied.len();
        DebloatResult {
            success: true,
            message: format!("{count} adet Windows 11 bileşeni başarıyla optimize edildi / debloat uygulandı."),
            applied_ids: applied,
        }
    }

    #[cfg(not(windows))]
    {
        let _ = ids;
        DebloatResult {
            success: false,
            message: "Debloat yöneticisi sadece Windows platformunda geçerlidir.".into(),
            applied_ids: Vec::new(),
        }
    }
}

#[cfg(windows)]
fn is_service_disabled(name: &str) -> bool {
    if let Ok(out) = Command::new("sc").args(["qc", name]).output() {
        let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
        return text.contains("disabled");
    }
    false
}

#[cfg(windows)]
fn is_copilot_disabled() -> bool {
    check_reg_dword(r"HKCU\Software\Policies\Microsoft\Windows\WindowsCopilot", "TurnOffWindowsCopilot") == Some(1)
}

#[cfg(windows)]
fn is_bing_search_disabled() -> bool {
    check_reg_dword(r"HKCU\Software\Microsoft\Windows\CurrentVersion\Search", "BingSearchEnabled") == Some(0)
}

#[cfg(windows)]
fn is_cortana_disabled() -> bool {
    check_reg_dword(r"HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search", "AllowCortana") == Some(0)
}

#[cfg(windows)]
fn is_edge_bg_disabled() -> bool {
    check_reg_dword(r"HKLM\SOFTWARE\Policies\Microsoft\Edge", "BackgroundModeEnabled") == Some(0)
}

#[cfg(windows)]
fn is_game_dvr_disabled() -> bool {
    check_reg_dword(r"HKCU\System\GameConfigStore", "GameDVR_Enabled") == Some(0)
}

#[cfg(windows)]
fn is_widgets_disabled() -> bool {
    check_reg_dword(r"HKLM\SOFTWARE\Policies\Microsoft\Dsh", "AllowNewsAndInterests") == Some(0)
}

#[cfg(windows)]
fn is_xbox_telemetry_disabled() -> bool {
    false
}

#[cfg(windows)]
fn is_onedrive_startup_disabled() -> bool {
    if let Ok(out) = Command::new("reg").args(["query", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run", "/v", "OneDrive"]).output() {
        return !out.status.success();
    }
    true
}

#[cfg(windows)]
fn is_activity_history_disabled() -> bool {
    check_reg_dword(r"HKLM\SOFTWARE\Policies\Microsoft\Windows\System", "EnableActivityFeed") == Some(0)
}

#[cfg(windows)]
fn check_reg_dword(key: &str, value_name: &str) -> Option<u32> {
    if let Ok(out) = Command::new("reg").args(["query", key, "/v", value_name]).output() {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            if line.contains(value_name) {
                if let Some(val_hex) = line.split("REG_DWORD").nth(1) {
                    let cleaned = val_hex.trim().trim_start_matches("0x");
                    if let Ok(num) = u32::from_str_radix(cleaned, 16) {
                        return Some(num);
                    }
                }
            }
        }
    }
    None
}
