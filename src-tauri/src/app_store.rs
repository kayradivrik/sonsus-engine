//! Hızlı Uygulama İndiricisi & Oyun Araçları Deposu (`app_store.rs`).
//! Windows 11 üzerinde winget entegrasyonu ve hızlı kurulum desteği.

use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickAppItem {
    pub id: String,
    pub name: String,
    pub category: String, // "launchers", "voice", "hardware", "tools", "runtimes"
    pub package_id: String, // winget paket ID'si
    pub description: String,
    pub icon_key: String,
    pub is_installed: bool,
    pub size_estimate: String,
}

/// Bilinen oyun araçları ve başlatıcılarının listesini döner.
pub fn get_curated_quick_apps() -> Vec<QuickAppItem> {
    vec![
        // 1. Oyun Başlatıcıları
        QuickAppItem {
            id: "steam".to_string(),
            name: "Steam".to_string(),
            category: "launchers".to_string(),
            package_id: "Valve.Steam".to_string(),
            description: "Dünyanın en popüler PC oyun platformu ve dijital mağazası.".to_string(),
            icon_key: "steam".to_string(),
            is_installed: check_app_installed("steam"),
            size_estimate: "~3 MB Kurulum (Genişler)".to_string(),
        },
        QuickAppItem {
            id: "epic".to_string(),
            name: "Epic Games Launcher".to_string(),
            category: "launchers".to_string(),
            package_id: "EpicGames.EpicGamesLauncher".to_string(),
            description: "Haftalık ücretsiz oyunlar, Unreal Engine ve Fortnite merkezi.".to_string(),
            icon_key: "epic".to_string(),
            is_installed: check_app_installed("epic"),
            size_estimate: "~180 MB".to_string(),
        },
        QuickAppItem {
            id: "ea_app".to_string(),
            name: "EA App".to_string(),
            category: "launchers".to_string(),
            package_id: "ElectronicArts.EADesktop".to_string(),
            description: "EA Play, FIFA/FC, Battlefield ve Need for Speed oyun başlatıcısı.".to_string(),
            icon_key: "ea".to_string(),
            is_installed: check_app_installed("ea_app"),
            size_estimate: "~120 MB".to_string(),
        },
        QuickAppItem {
            id: "battlenet".to_string(),
            name: "Battle.net".to_string(),
            category: "launchers".to_string(),
            package_id: "Blizzard.BattleNet".to_string(),
            description: "Call of Duty, Diablo, Overwatch ve Warcraft oyun platformu.".to_string(),
            icon_key: "battlenet".to_string(),
            is_installed: check_app_installed("battlenet"),
            size_estimate: "~150 MB".to_string(),
        },
        QuickAppItem {
            id: "gog".to_string(),
            name: "GOG Galaxy".to_string(),
            category: "launchers".to_string(),
            package_id: "GOG.Galaxy".to_string(),
            description: "DRM-Free oyun mağazası ve kütüphane birleştirici.".to_string(),
            icon_key: "gog".to_string(),
            is_installed: check_app_installed("gog"),
            size_estimate: "~210 MB".to_string(),
        },

        // 2. İletişim & Ses
        QuickAppItem {
            id: "discord".to_string(),
            name: "Discord".to_string(),
            category: "voice".to_string(),
            package_id: "Discord.Discord".to_string(),
            description: "Düşük gecikmeli sesli sohbet, ekran paylaşımı ve oyuncu toplulukları.".to_string(),
            icon_key: "discord".to_string(),
            is_installed: check_app_installed("discord"),
            size_estimate: "~90 MB".to_string(),
        },
        QuickAppItem {
            id: "teamspeak".to_string(),
            name: "TeamSpeak Client".to_string(),
            category: "voice".to_string(),
            package_id: "TeamSpeakSystems.TeamSpeakClient".to_string(),
            description: "Rekabetçi e-spor takımları için ultra düşük pingli sesli iletişim.".to_string(),
            icon_key: "teamspeak".to_string(),
            is_installed: check_app_installed("teamspeak"),
            size_estimate: "~85 MB".to_string(),
        },

        // 3. Donanım & GPU & Performans
        QuickAppItem {
            id: "nvidia_app".to_string(),
            name: "NVIDIA App (GeForce)".to_string(),
            category: "hardware".to_string(),
            package_id: "Nvidia.App".to_string(),
            description: "RTX 4050 için modern Game Ready sürücü güncellemeleri, DLSS ve gölge kaydı.".to_string(),
            icon_key: "nvidia".to_string(),
            is_installed: check_app_installed("nvidia_app"),
            size_estimate: "~140 MB".to_string(),
        },
        QuickAppItem {
            id: "msi_afterburner".to_string(),
            name: "MSI Afterburner & RTSS".to_string(),
            category: "hardware".to_string(),
            package_id: "Guru3D.MSIAfterburner".to_string(),
            description: "Oyun içi FPS, GPU/CPU sıcaklık göstergesi ve fan kontrol aracı.".to_string(),
            icon_key: "msi".to_string(),
            is_installed: check_app_installed("msi_afterburner"),
            size_estimate: "~55 MB".to_string(),
        },
        QuickAppItem {
            id: "cpuz".to_string(),
            name: "CPU-Z".to_string(),
            category: "hardware".to_string(),
            package_id: "CPUID.CPU-Z".to_string(),
            description: "Intel Core i5-13500H işlemci çekirdek, voltaj ve önbellek analizörü.".to_string(),
            icon_key: "cpuz".to_string(),
            is_installed: check_app_installed("cpuz"),
            size_estimate: "~6 MB".to_string(),
        },
        QuickAppItem {
            id: "gpuz".to_string(),
            name: "GPU-Z".to_string(),
            category: "hardware".to_string(),
            package_id: "TechPowerUp.GPU-Z".to_string(),
            description: "NVIDIA RTX 4050 VRAM, saat hızları ve sensör ayrıntıları.".to_string(),
            icon_key: "gpuz".to_string(),
            is_installed: check_app_installed("gpuz"),
            size_estimate: "~10 MB".to_string(),
        },

        // 4. Oyun Araçları & Runtimes
        QuickAppItem {
            id: "obs_studio".to_string(),
            name: "OBS Studio".to_string(),
            category: "tools".to_string(),
            package_id: "OBSProject.OBSStudio".to_string(),
            description: "NVENC donanım hızlandırmalı canlı yayın ve yüksek kaliteli oyun kaydı.".to_string(),
            icon_key: "obs".to_string(),
            is_installed: check_app_installed("obs_studio"),
            size_estimate: "~130 MB".to_string(),
        },
        QuickAppItem {
            id: "sevenzip".to_string(),
            name: "7-Zip".to_string(),
            category: "tools".to_string(),
            package_id: "7zip.7zip".to_string(),
            description: "Oyun modları ve arşivleri için en hızlı ve hafif sıkıştırma programı.".to_string(),
            icon_key: "sevenzip".to_string(),
            is_installed: check_app_installed("sevenzip"),
            size_estimate: "~2 MB".to_string(),
        },
        QuickAppItem {
            id: "vcredist".to_string(),
            name: "Visual C++ Runtimes (All-in-One)".to_string(),
            category: "runtimes".to_string(),
            package_id: "Microsoft.VCRedist.2015+.x64".to_string(),
            description: "Tüm modern DirectX ve Steam oyunlarının eksiksiz çalışması için gerekli kütüphaneler.".to_string(),
            icon_key: "vcredist".to_string(),
            is_installed: check_app_installed("vcredist"),
            size_estimate: "~30 MB".to_string(),
        },
        QuickAppItem {
            id: "directx".to_string(),
            name: "DirectX End-User Runtimes".to_string(),
            category: "runtimes".to_string(),
            package_id: "Microsoft.DirectX".to_string(),
            description: "Eski ve yeni oyunlar için eksik D3D derleyicileri ve ses bileşenleri paketi.".to_string(),
            icon_key: "directx".to_string(),
            is_installed: check_app_installed("directx"),
            size_estimate: "~95 MB".to_string(),
        },
    ]
}

/// Uygulamanın sistemde kurulu olup olmadığını disk veya kayıt defteri yollarından anında kontrol eder (0ms gecikme).
fn check_app_installed(app_id: &str) -> bool {
    #[cfg(windows)]
    {
        let local_appdata = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let appdata = std::env::var("APPDATA").unwrap_or_default();
        let prog_files = std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".to_string());
        let prog_files_x86 = std::env::var("ProgramFiles(x86)").unwrap_or_else(|_| "C:\\Program Files (x86)".to_string());
        let win_dir = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());

        match app_id {
            "steam" => {
                Path::new(&format!("{}\\Steam\\steam.exe", prog_files_x86)).exists()
                    || Path::new(&format!("{}\\Steam\\steam.exe", prog_files)).exists()
            }
            "epic" => {
                Path::new(&format!("{}\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe", prog_files_x86)).exists()
                    || Path::new(&format!("{}\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe", prog_files)).exists()
            }
            "ea_app" => {
                Path::new(&format!("{}\\Electronic Arts\\EA Desktop\\EA Desktop\\EADesktop.exe", prog_files)).exists()
            }
            "battlenet" => {
                Path::new(&format!("{}\\Battle.net\\Battle.net.exe", prog_files_x86)).exists()
                    || Path::new(&format!("{}\\Battle.net\\Battle.net.exe", prog_files)).exists()
            }
            "gog" => {
                Path::new(&format!("{}\\GOG Galaxy\\GalaxyClient.exe", prog_files_x86)).exists()
            }
            "discord" => {
                Path::new(&format!("{}\\Discord\\Update.exe", local_appdata)).exists()
                    || Path::new(&format!("{}\\Discord", appdata)).exists()
            }
            "teamspeak" => {
                Path::new(&format!("{}\\TeamSpeak 3 Client\\ts3client_win64.exe", prog_files)).exists()
            }
            "nvidia_app" => {
                Path::new(&format!("{}\\NVIDIA Corporation\\NVIDIA App\\NVIDIA App.exe", prog_files)).exists()
                    || Path::new(&format!("{}\\NVIDIA Corporation\\NVIDIA GeForce Experience\\NVIDIA GeForce Experience.exe", prog_files)).exists()
                    || Path::new(&format!("{}\\NVIDIA Corporation\\NVIDIA GeForce Experience\\NVIDIA GeForce Experience.exe", prog_files_x86)).exists()
            }
            "msi_afterburner" => {
                Path::new(&format!("{}\\MSI Afterburner\\MSIAfterburner.exe", prog_files_x86)).exists()
            }
            "cpuz" => {
                Path::new(&format!("{}\\CPUID\\CPU-Z\\cpuz.exe", prog_files)).exists()
            }
            "gpuz" => {
                Path::new(&format!("{}\\GPU-Z.exe", prog_files)).exists()
                    || Path::new(&format!("{}\\TechPowerUp GPU-Z", prog_files_x86)).exists()
            }
            "obs_studio" => {
                Path::new(&format!("{}\\obs-studio\\bin\\64bit\\obs64.exe", prog_files)).exists()
            }
            "sevenzip" => {
                Path::new(&format!("{}\\7-Zip\\7z.exe", prog_files)).exists()
                    || Path::new(&format!("{}\\7-Zip\\7z.exe", prog_files_x86)).exists()
            }
            "vcredist" => {
                Path::new(&format!("{}\\System32\\vcruntime140.dll", win_dir)).exists()
            }
            "directx" => {
                Path::new(&format!("{}\\System32\\d3dx9_43.dll", win_dir)).exists()
            }
            _ => false,
        }
    }
    #[cfg(not(windows))]
    {
        false
    }
}

/// winget kullanarak belirtilen paketi sessizce (silent) arka planda yükler.
pub async fn install_app_via_winget(package_id: &str) -> Result<String, String> {
    #[cfg(windows)]
    {
        let pkg = package_id.to_string();
        tokio::task::spawn_blocking(move || {
            let mut cmd = std::process::Command::new("winget");
            cmd.args([
                "install",
                "--id",
                &pkg,
                "--silent",
                "--accept-source-agreements",
                "--accept-package-agreements",
            ]);

            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                cmd.creation_flags(CREATE_NO_WINDOW);
            }

            match cmd.output() {
                Ok(out) => {
                    if out.status.success() {
                        Ok(format!("{} başarıyla kuruldu.", pkg))
                    } else {
                        let err_text = String::from_utf8_lossy(&out.stderr);
                        let stdout_text = String::from_utf8_lossy(&out.stdout);
                        let combined = format!("{}\n{}", stdout_text, err_text);
                        // Eğer zaten kuruluysa hata değil bilgi say
                        if combined.contains("already installed") || combined.contains("Zaten yüklü") {
                            Ok(format!("{} zaten sisteminizde kurulu.", pkg))
                        } else {
                            Err(format!("Yükleme hatası (çıkış kodu {}): {}", out.status, combined.trim()))
                        }
                    }
                }
                Err(e) => Err(format!("winget çalıştırılamadı: {}", e)),
            }
        })
        .await
        .map_err(|e| format!("Görev hatası: {}", e))?
    }
    #[cfg(not(windows))]
    {
        Err("Hızlı uygulama kurulumu şu anda yalnızca Windows işletim sisteminde desteklenmektedir.".to_string())
    }
}
