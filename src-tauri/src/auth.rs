//! Doğrudan Mağaza OAuth Oturum Yöneticisi (`auth.rs`).
//!
//! Heroic Games Launcher kurulu olmasa bile Epic Games (`legendary auth --code`) ve
//! GOG (`auth.gog.com` OAuth2 + `embed.gog.com` kütüphane senkronizasyonu) hesaplarına
//! doğrudan `sonsus-engine` içerisinden giriş/çıkış yapılmasını sağlar.

use crate::{
    db::app_data_dir,
    models::StoreAuthStatus,
    parsers::{
        epic::{find_heroic_roots, find_legendary_binary_path},
        steam::{detect_steam_id64, find_steam_root_with_override},
    },
};
use std::{fs, path::PathBuf, process::Command};

pub const EPIC_AUTH_URL: &str = "https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect%3FclientId%3D34a02cf8f4414e29b15921876da36f9a%26responseType%3Dcode";
pub const GOG_AUTH_URL: &str = "https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&response_type=code&layout=galaxy";

const GOG_CLIENT_ID: &str = "46899977096215655";
const GOG_CLIENT_SECRET: &str = "9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9";
const GOG_REDIRECT_URI: &str = "https://embed.gog.com/on_login_success?origin=client";

pub fn sonsus_gog_auth_file() -> Option<PathBuf> {
    app_data_dir().ok().map(|d| d.join("gog_auth.json"))
}

pub fn sonsus_gog_cloud_cache_file() -> Option<PathBuf> {
    app_data_dir().ok().map(|d| d.join("gog_cloud_library.json"))
}

fn detect_steam_persona(steam_root: &std::path::Path) -> Option<String> {
    let vdf = fs::read_to_string(steam_root.join("config/loginusers.vdf")).ok()?;
    for line in vdf.lines() {
        let trimmed = line.trim();
        if trimmed.to_lowercase().starts_with("\"personaname\"") {
            let parts: Vec<&str> = trimmed.split('"').collect();
            if parts.len() >= 4 && !parts[3].trim().is_empty() {
                return Some(parts[3].trim().to_string());
            }
        }
    }
    None
}

fn detect_epic_display_name() -> Option<String> {
    let mut user_files = Vec::new();
    if let Some(cfg) = dirs::config_dir() {
        user_files.push(cfg.join("legendary/user.json"));
    }
    for hr in find_heroic_roots() {
        user_files.push(hr.join("legendaryConfig/legendary/user.json"));
    }

    for f in user_files {
        if let Ok(raw) = fs::read_to_string(f) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) {
                if let Some(name) = json
                    .get("displayName")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                {
                    return Some(name.to_string());
                }
                if json.get("access_token").is_some() {
                    return Some("Epic Hesabı Bağlı".into());
                }
            }
        }
    }
    None
}

fn detect_gog_username() -> Option<String> {
    if let Some(auth_pb) = sonsus_gog_auth_file() {
        if let Ok(raw) = fs::read_to_string(auth_pb) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) {
                if let Some(u) = json
                    .get("username")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                {
                    return Some(u.to_string());
                }
                if json.get("access_token").is_some() || json.get(GOG_CLIENT_ID).is_some() {
                    return Some("GOG Hesabı Bağlı".into());
                }
            }
        }
    }

    for hr in find_heroic_roots() {
        let auth_pb = hr.join("gog_store/auth.json");
        if let Ok(raw) = fs::read_to_string(auth_pb) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) {
                if json.get(GOG_CLIENT_ID).is_some() || json.get("access_token").is_some() {
                    return Some("Heroic GOG Oturumu".into());
                }
            }
        }
    }

    None
}

pub fn query_store_auth_status(custom_steam_root: Option<&str>) -> StoreAuthStatus {
    let steam_root = find_steam_root_with_override(custom_steam_root);
    let steam_id64 = steam_root.as_deref().and_then(detect_steam_id64);
    let steam_persona = steam_root.as_deref().and_then(detect_steam_persona);

    let epic_display_name = detect_epic_display_name();
    let gog_username = detect_gog_username();

    StoreAuthStatus {
        steam_connected: steam_id64.is_some(),
        steam_persona,
        steam_id64,
        epic_connected: epic_display_name.is_some(),
        epic_display_name,
        gog_connected: gog_username.is_some(),
        gog_username,
    }
}

/// Kullanıcının yapıştırdığı JSON yanıtından, yönlendirme URL'sinden veya ham metinden
/// yetkilendirme kodunu (`authorizationCode` / `?code=`) ayıklar.
pub fn extract_oauth_code(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    if trimmed.starts_with('{') {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(trimmed) {
            for key in ["authorizationCode", "code", "sid"] {
                if let Some(c) = json
                    .get(key)
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.trim().is_empty())
                {
                    return Some(c.trim().to_string());
                }
            }
        }
    }

    if let Some(idx) = trimmed.find("code=") {
        let rest = &trimmed[idx + 5..];
        let code = rest.split('&').next().unwrap_or(rest).trim();
        if !code.is_empty() {
            return Some(code.to_string());
        }
    }

    Some(trimmed.trim_matches('"').to_string())
}

pub async fn login_epic_with_code(raw_input: &str) -> Result<String, String> {
    let code = extract_oauth_code(raw_input)
        .ok_or_else(|| "Lütfen geçerli bir Epic yetkilendirme kodu girin.".to_string())?;
    let bin = find_legendary_binary_path().ok_or_else(|| {
        "Epic Games oturumu için sistemde Legendary motoru bulunamadı.".to_string()
    })?;

    let bin_clone = bin.clone();
    let code_clone = code.clone();

    let auth_out = tokio::task::spawn_blocking(move || {
        let mut cmd = Command::new(&bin_clone);
        cmd.args(["auth", "--code", &code_clone]);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x0800_0000);
        }
        cmd.output().map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())??;

    if !auth_out.status.success() {
        let stderr = String::from_utf8_lossy(&auth_out.stderr);
        return Err(format!("Epic oturumu açılamadı: {}", stderr.trim()));
    }

    // Kütüphane meta dosyalarını (`~/.config/legendary/metadata/*.json`) hemen senkronla
    let _ = tokio::task::spawn_blocking(move || {
        let mut list_cmd = Command::new(&bin);
        list_cmd.args(["list", "--json"]);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            list_cmd.creation_flags(0x0800_0000);
        }
        let _ = list_cmd.output();
    })
    .await;

    Ok(detect_epic_display_name().unwrap_or_else(|| "Epic Hesabı".into()))
}

pub fn logout_epic() -> Result<(), String> {
    if let Some(bin) = find_legendary_binary_path() {
        let _ = Command::new(bin).args(["auth", "--delete"]).status();
    }
    if let Some(cfg) = dirs::config_dir() {
        let _ = fs::remove_file(cfg.join("legendary/user.json"));
    }
    Ok(())
}

pub async fn sync_gog_cloud_library_with_token(access_token: &str) -> Result<usize, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let mut all_products: Vec<serde_json::Value> = Vec::new();
    let mut page = 1usize;

    loop {
        let url = format!(
            "https://embed.gog.com/account/getFilteredProducts.json?mediaType=1&page={page}"
        );
        let resp = client
            .get(&url)
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| format!("GOG kütüphanesi alınamadı: {e}"))?;

        if !resp.status().is_success() {
            break;
        }
        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        if let Some(prods) = json.get("products").and_then(|v| v.as_array()) {
            all_products.extend(prods.iter().cloned());
        }
        let total_pages = json
            .get("totalPages")
            .and_then(|v| v.as_u64())
            .unwrap_or(1) as usize;
        if page >= total_pages || page >= 20 {
            break;
        }
        page += 1;
    }

    if let Some(cache_pb) = sonsus_gog_cloud_cache_file() {
        if let Ok(raw) = serde_json::to_string_pretty(&all_products) {
            let _ = fs::write(cache_pb, raw);
        }
    }

    Ok(all_products.len())
}

pub async fn login_gog_with_code(raw_input: &str) -> Result<String, String> {
    let code = extract_oauth_code(raw_input)
        .ok_or_else(|| "Lütfen geçerli bir GOG yetkilendirme kodu veya URL girin.".to_string())?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let token_resp = client
        .get("https://auth.gog.com/token")
        .query(&[
            ("client_id", GOG_CLIENT_ID),
            ("client_secret", GOG_CLIENT_SECRET),
            ("grant_type", "authorization_code"),
            ("code", &code),
            ("redirect_uri", GOG_REDIRECT_URI),
        ])
        .send()
        .await
        .map_err(|e| format!("GOG sunucusuna ulaşılamadı: {e}"))?;

    if !token_resp.status().is_success() {
        return Err("GOG yetkilendirme kodu geçersiz veya süresi dolmuş.".into());
    }

    let mut token_json: serde_json::Value =
        token_resp.json().await.map_err(|e| e.to_string())?;
    let access_token = token_json
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "GOG erişim anahtarı alınamadı.".to_string())?
        .to_string();

    // Kullanıcı adını çek
    let mut username = "GOG Oyuncusu".to_string();
    if let Ok(u_resp) = client
        .get("https://embed.gog.com/userData.json")
        .bearer_auth(&access_token)
        .send()
        .await
    {
        if let Ok(u_json) = u_resp.json::<serde_json::Value>().await {
            if let Some(u) = u_json
                .get("username")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
            {
                username = u.to_string();
            }
        }
    }

    // Hem gogdl uyumlu formatta (`{"46899977096215655": {...}}`) hem `username` ile kaydet
    let auth_pb = sonsus_gog_auth_file()
        .ok_or_else(|| "GOG kimlik dosyası yolu oluşturulamadı.".to_string())?;
    if let Some(obj) = token_json.as_object_mut() {
        obj.insert("username".into(), serde_json::Value::String(username.clone()));
    }
    let wrapped = serde_json::json!({
        GOG_CLIENT_ID: token_json.clone(),
        "access_token": access_token,
        "username": username,
    });
    fs::write(&auth_pb, serde_json::to_string_pretty(&wrapped).unwrap_or_default())
        .map_err(|e| e.to_string())?;

    let _ = sync_gog_cloud_library_with_token(&access_token).await;

    Ok(username)
}

pub fn logout_gog() -> Result<(), String> {
    if let Some(p) = sonsus_gog_auth_file() {
        let _ = fs::remove_file(p);
    }
    if let Some(p) = sonsus_gog_cloud_cache_file() {
        let _ = fs::remove_file(p);
    }
    Ok(())
}

