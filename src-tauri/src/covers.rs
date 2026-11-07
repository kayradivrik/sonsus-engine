use std::{
    fs,
    path::{Path, PathBuf},
    time::Duration,
};

pub fn covers_cache_dir() -> Option<PathBuf> {
    let dir = dirs::cache_dir()?.join("sonsus-engine/covers");
    let _ = fs::create_dir_all(&dir);
    Some(dir)
}

async fn fetch_steam_store_fallback_cover(
    client: &reqwest::Client,
    platform: &str,
    platform_id: &str,
    title: &str,
    cached_file: &Path,
) -> Option<String> {
    let appid = if platform == "steam" {
        platform_id.parse::<u64>().ok()
    } else {
        let search_url = format!(
            "https://store.steampowered.com/api/storesearch/?term={}&l=turkish&cc=US",
            url_encode(title)
        );
        let resp = client.get(&search_url).send().await.ok()?;
        let json: serde_json::Value = resp.json().await.ok()?;
        json["items"].get(0)?.get("id")?.as_u64()
    }?;

    let candidates = [
        format!(
            "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900_2x.jpg"
        ),
        format!(
            "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900.jpg"
        ),
        format!("https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/library_600x900.jpg"),
        format!(
            "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{appid}/header.jpg"
        ),
    ];

    for url in candidates {
        if let Ok(resp) = client.get(&url).send().await {
            if resp.status().is_success() {
                if let Ok(bytes) = resp.bytes().await {
                    if bytes.len() > 1024 && fs::write(cached_file, &bytes).is_ok() {
                        return Some(cached_file.to_string_lossy().into_owned());
                    }
                }
            }
        }
    }
    None
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

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(8))
        .user_agent("SonsusEngine/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    if !force_sgdb {
        if let Some(hint) = existing_hint {
            if !hint.starts_with("http://")
                && !hint.starts_with("https://")
                && Path::new(hint).exists()
            {
                return Ok(Some(hint.to_string()));
            }
            if hint.starts_with("http://") || hint.starts_with("https://") {
                if let Ok(resp) = client.get(hint).send().await {
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

    // 1) SteamGridDB API anahtarı tanımlıysa yüksek çözünürlüklü 600x900 dikey poster dene
    if let Some(api_key) = sgdb_api_key.map(str::trim).filter(|k| !k.is_empty()) {
        let grid_endpoint = if platform == "steam" {
            Some(format!(
                "https://www.steamgriddb.com/api/v2/grids/steam/{platform_id}?dimensions=600x900"
            ))
        } else {
            let search_url = format!(
                "https://www.steamgriddb.com/api/v2/search/autocomplete/{}",
                url_encode(title)
            );
            if let Ok(search_resp) = client.get(&search_url).bearer_auth(api_key).send().await {
                if let Ok(search_json) = search_resp.json::<serde_json::Value>().await {
                    search_json["data"]
                        .get(0)
                        .and_then(|v| v["id"].as_u64())
                        .map(|sgdb_id| {
                            format!(
                                "https://www.steamgriddb.com/api/v2/grids/game/{sgdb_id}?dimensions=600x900"
                            )
                        })
                } else {
                    None
                }
            } else {
                None
            }
        };

        if let Some(ep) = grid_endpoint {
            if let Ok(grids_resp) = client.get(&ep).bearer_auth(api_key).send().await {
                if let Ok(grids_json) = grids_resp.json::<serde_json::Value>().await {
                    if let Some(img_url) = grids_json["data"].get(0).and_then(|v| v["url"].as_str())
                    {
                        if let Ok(resp) = client.get(img_url).send().await {
                            if let Ok(bytes) = resp.bytes().await {
                                if fs::write(&cached_file, &bytes).is_ok() {
                                    return Ok(Some(cached_file.to_string_lossy().into_owned()));
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 2) API Anahtarsız Otomatik Poster Yedeği (Steam CDN 600x900_2x / 600x900)
    if let Some(steam_fallback) =
        fetch_steam_store_fallback_cover(&client, platform, platform_id, title, &cached_file).await
    {
        return Ok(Some(steam_fallback));
    }

    if force_sgdb && sgdb_api_key.map(str::trim).filter(|k| !k.is_empty()).is_none() {
        return Err(
            "Bu oyun için Steam CDN üzerinde kapak bulunamadı. Özel kapaklar için Ayarlar'dan SteamGridDB API anahtarı ekleyebilirsiniz."
                .into(),
        );
    }

    Ok(existing_hint.map(ToOwned::to_owned))
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
