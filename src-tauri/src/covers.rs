use std::{
    fs,
    path::{Path, PathBuf},
};

pub fn covers_cache_dir() -> Option<PathBuf> {
    let dir = dirs::cache_dir()?.join("sonsus-engine/covers");
    let _ = fs::create_dir_all(&dir);
    Some(dir)
}

pub async fn resolve_or_fetch_cover(
    platform: &str,
    platform_id: &str,
    title: &str,
    existing_hint: Option<&str>,
    sgdb_api_key: Option<&str>,
    force_sgdb: bool,
) -> Result<Option<String>, String> {
    let cache_dir = covers_cache_dir().ok_or("Önbellek dizini oluşturulamadı")?;
    let safe_id: String = platform_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let cached_file = cache_dir.join(format!("{platform}_{safe_id}.jpg"));

    if !force_sgdb && cached_file.exists() {
        return Ok(Some(cached_file.to_string_lossy().into_owned()));
    }

    if !force_sgdb {
        if let Some(hint) = existing_hint {
            if !hint.starts_with("http://") && !hint.starts_with("https://") && Path::new(hint).exists() {
                return Ok(Some(hint.to_string()));
            }
            if hint.starts_with("http://") || hint.starts_with("https://") {
                if let Ok(resp) = reqwest::get(hint).await {
                    if resp.status().is_success() {
                        if let Ok(bytes) = resp.bytes().await {
                            let _ = fs::write(&cached_file, &bytes);
                            return Ok(Some(cached_file.to_string_lossy().into_owned()));
                        }
                    }
                }
            }
        }
    }

    let Some(api_key) = sgdb_api_key.map(str::trim).filter(|k| !k.is_empty()) else {
        return if force_sgdb {
            Err("SteamGridDB API anahtarı ayarlanmamış. Ayarlar > Mağaza ve API menüsünden ekleyin.".into())
        } else {
            Ok(existing_hint.map(ToOwned::to_owned))
        };
    };

    let client = reqwest::Client::new();
    let grid_endpoint = if platform == "steam" {
        format!("https://www.steamgriddb.com/api/v2/grids/steam/{platform_id}?dimensions=600x900")
    } else {
        let search_url = format!(
            "https://www.steamgriddb.com/api/v2/search/autocomplete/{}",
            url_encode(title)
        );
        let search_resp = client
            .get(&search_url)
            .bearer_auth(api_key)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let search_json: serde_json::Value =
            search_resp.json().await.map_err(|e| e.to_string())?;
        let sgdb_id = search_json["data"]
            .get(0)
            .and_then(|v| v["id"].as_u64())
            .ok_or_else(|| format!("SteamGridDB üzerinde '{title}' bulunamadı"))?;
        format!("https://www.steamgriddb.com/api/v2/grids/game/{sgdb_id}?dimensions=600x900")
    };

    let grids_resp = client
        .get(&grid_endpoint)
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let grids_json: serde_json::Value = grids_resp.json().await.map_err(|e| e.to_string())?;

    let img_url = grids_json["data"]
        .get(0)
        .and_then(|v| v["url"].as_str())
        .ok_or_else(|| "SteamGridDB 600x900 poster döndürmedi".to_string())?;

    let bytes = client
        .get(img_url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;

    fs::write(&cached_file, &bytes).map_err(|e| e.to_string())?;
    Ok(Some(cached_file.to_string_lossy().into_owned()))
}

fn url_encode(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' => (b as char).to_string(),
            b' ' => "%20".to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect()
}
