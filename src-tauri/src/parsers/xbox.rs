//! Windows 11 Xbox Game Pass & Microsoft Store Oyun Tarayıcısı (`xbox.rs`).
//!
//! Windows 11 üzerinde `C:\XboxGames`, `D:\XboxGames` vb. sürücülerdeki
//! Game Pass oyunlarını `appxmanifest.xml` veya `MicrosoftGame.Config`
//! dosyalarından otomatik ayrıştırıp `UnifiedGame` olarak sisteme ekler.

use crate::models::{InstallStatus, LaunchConfig, Platform, UnifiedGame};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

pub fn scan_xbox_all() -> Vec<UnifiedGame> {
    let mut games: HashMap<String, UnifiedGame> = HashMap::new();

    #[cfg(windows)]
    {
        scan_xbox_drives(&mut games);
    }

    games.into_values().collect()
}

#[cfg(windows)]
fn scan_xbox_drives(games: &mut HashMap<String, UnifiedGame>) {
    // Tüm sürücü harflerini tara (C'den Z'ye)
    for drive in b'C'..=b'Z' {
        let drive_letter = drive as char;
        let root = PathBuf::from(format!("{}:\\XboxGames", drive_letter));
        if root.is_dir() {
            scan_xbox_root(&root, games);
        }
    }
}

#[cfg(windows)]
fn scan_xbox_root(root: &Path, games: &mut HashMap<String, UnifiedGame>) {
    let Ok(entries) = fs::read_dir(root) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let folder_name = entry.file_name().to_string_lossy().to_string();
        if folder_name.eq_ignore_ascii_case("GameSave") || folder_name.starts_with('.') {
            continue;
        }

        // Oyun dosyaları doğrudan klasörde veya "Content" alt klasöründe yer alır
        let content_dir = if path.join("Content").is_dir() {
            path.join("Content")
        } else {
            path.clone()
        };

        if let Some(game) = parse_xbox_game(&content_dir, &folder_name) {
            games.insert(game.id.clone(), game);
        }
    }
}

#[cfg(windows)]
fn parse_xbox_game(dir: &Path, folder_name: &str) -> Option<UnifiedGame> {
    let manifest_path = dir.join("appxmanifest.xml");
    let config_path = dir.join("MicrosoftGame.Config");

    let mut title: Option<String> = None;
    let mut package_name: Option<String> = None;
    let mut logo_filename: Option<String> = None;
    let mut splash_filename: Option<String> = None;
    let mut exe_name: Option<String> = None;

    if manifest_path.is_file() {
        if let Ok(content) = fs::read_to_string(&manifest_path) {
            // <DisplayName>Minecraft for Windows</DisplayName>
            title = extract_xml_content(&content, "DisplayName")
                .or_else(|| extract_xml_attribute(&content, "VisualElements", "DisplayName"));
            // <Identity Name="Microsoft.MinecraftUWP" ... />
            package_name = extract_xml_attribute(&content, "Identity", "Name");
            // <Logo>StoreLogo.png</Logo>
            logo_filename = extract_xml_content(&content, "Logo")
                .or_else(|| extract_xml_attribute(&content, "VisualElements", "Square150x150Logo"));
            // <uap:SplashScreen Image="MCSplashScreen.png" />
            splash_filename = extract_xml_attribute(&content, "SplashScreen", "Image");
            // <Application Id="Game" Executable="GameLaunchHelper.exe" ...>
            exe_name = extract_xml_attribute(&content, "Application", "Executable");
        }
    } else if config_path.is_file() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            // DefaultDisplayName="Minecraft Launcher"
            title = extract_xml_attribute(&content, "ShellVisuals", "DefaultDisplayName")
                .or_else(|| extract_xml_attribute(&content, "Executable", "OverrideDisplayName"));
            // <Identity Name="Microsoft.4297127D64EC6" ... />
            package_name = extract_xml_attribute(&content, "Identity", "Name");
            // Square150x150Logo="GraphicsLogo.png"
            logo_filename = extract_xml_attribute(&content, "ShellVisuals", "Square150x150Logo")
                .or_else(|| extract_xml_attribute(&content, "ShellVisuals", "StoreLogo"));
            // SplashScreenImage="SplashScreen.png"
            splash_filename = extract_xml_attribute(&content, "ShellVisuals", "SplashScreenImage");
            // <Executable Name="Minecraft.exe" ...>
            exe_name = extract_xml_attribute(&content, "Executable", "Name");
        }
    }

    let game_title = title.unwrap_or_else(|| folder_name.to_string());
    let pkg_id = package_name.unwrap_or_else(|| {
        folder_name
            .to_lowercase()
            .replace(' ', "-")
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-')
            .collect()
    });

    // Başlatıcı çalıştırılabilir dosyası
    // GameLaunchHelper.exe Xbox lisans ve kimliğini otomatik bağlayarak oyunu açar
    let exe_path = if dir.join("gamelaunchhelper.exe").is_file() {
        dir.join("gamelaunchhelper.exe")
    } else if let Some(ref e) = exe_name {
        if dir.join(e).is_file() {
            dir.join(e)
        } else {
            dir.join("gamelaunchhelper.exe")
        }
    } else {
        dir.join("gamelaunchhelper.exe")
    };

    // Kapak ve banner görsellerini tespit et
    let cover_path = find_image_candidate(dir, logo_filename.as_deref(), &[
        "StoreLogo.png",
        "Logo.png",
        "LargeLogo.png",
        "GraphicsLogo.png",
        "SmallLogo.png",
    ]);

    let hero_path = find_image_candidate(dir, splash_filename.as_deref(), &[
        "SplashScreen.png",
        "MCSplashScreen.png",
        "GraphicsLogo.png",
        "StoreLogo.png",
    ]);

    // Klasör boyutunu yaklaşık hesapla
    let size_bytes = calculate_dir_size(dir);

    Some(UnifiedGame {
        id: format!("xbox-{}", pkg_id.to_lowercase().replace('.', "-")),
        platform_id: pkg_id,
        platform: Platform::Xbox,
        title: game_title,
        status: InstallStatus::Installed,
        install_path: Some(dir.to_path_buf()),
        size_bytes: Some(size_bytes),
        playtime_minutes: 0,
        last_played_epoch: None,
        cover_path_or_url: cover_path.map(|p| p.to_string_lossy().to_string()),
        fallback_cover_url: None,
        hero_path_or_url: hero_path.map(|p| p.to_string_lossy().to_string()),
        genres: vec!["Xbox Game Pass".into()],
        developer: Some("Xbox Game Studios / Microsoft".into()),
        store_slug: None,
        summary_hint: Some("Xbox Game Pass / Microsoft Store oyunu".into()),
        is_favorite: false,
        is_hidden: false,
        collection_tag: Some("Xbox".into()),
        update_available: None,
        launch: Some(LaunchConfig {
            command_uri_or_bin: exe_path.to_string_lossy().to_string(),
            args: Vec::new(),
            working_dir: Some(dir.to_path_buf()),
            wine_prefix: None,
        }),
        install_uri: None,
    })
}

#[cfg(windows)]
fn find_image_candidate(dir: &Path, preferred: Option<&str>, fallbacks: &[&str]) -> Option<PathBuf> {
    if let Some(pref) = preferred {
        let p = dir.join(pref);
        if p.is_file() {
            return Some(p);
        }
    }

    for fb in fallbacks {
        let p = dir.join(fb);
        if p.is_file() {
            return Some(p);
        }
    }

    None
}

#[cfg(windows)]
fn extract_xml_content(xml: &str, tag: &str) -> Option<String> {
    let open_tag = format!("<{tag}>");
    let open_tag_len = open_tag.len();
    let close_tag = format!("</{tag}>");

    let start = xml.find(&open_tag)?;
    let end = xml[start + open_tag_len..].find(&close_tag)?;
    let val = xml[start + open_tag_len..start + open_tag_len + end].trim();
    if val.is_empty() {
        None
    } else {
        Some(val.to_string())
    }
}

#[cfg(windows)]
fn extract_xml_attribute(xml: &str, element: &str, attr: &str) -> Option<String> {
    let pattern = format!("{element}");
    let attr_pattern = format!("{attr}=\"");

    let el_pos = xml.find(&pattern)?;
    let slice = &xml[el_pos..];
    let end_tag = slice.find('>')?;
    let el_content = &slice[..end_tag];

    let attr_pos = el_content.find(&attr_pattern)?;
    let attr_val_start = attr_pos + attr_pattern.len();
    let quote_end = el_content[attr_val_start..].find('"')?;
    let val = el_content[attr_val_start..attr_val_start + quote_end].trim();
    if val.is_empty() {
        None
    } else {
        Some(val.to_string())
    }
}

#[cfg(windows)]
fn calculate_dir_size(dir: &Path) -> u64 {
    let mut total = 0u64;
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    total += meta.len();
                }
            }
        }
    }
    total
}
