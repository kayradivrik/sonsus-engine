//! Canlı Steam indirimleri ve Epic Games haftalık ücretsiz oyunlarını çeken servis (`deals.rs`).

use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameDealItem {
    pub id: String,
    pub title: String,
    pub store: String, // "steam" | "epic"
    pub original_price: Option<String>,
    pub final_price: String,
    pub discount_percent: i32,
    pub is_free: bool,
    pub banner_url: String,
    pub store_url: String,
    pub expiry_date: Option<String>,
}

/// Steam'deki en popüler indirimleri çeker
pub async fn fetch_steam_specials() -> Vec<GameDealItem> {
    let client = reqwest::Client::builder()
        .user_agent("sonsus-engine/1.0.0")
        .timeout(Duration::from_secs(6))
        .build();

    let Ok(client) = client else { return Vec::new(); };

    let url = "https://store.steampowered.com/api/featuredcategories/?cc=tr&l=turkish";
    let Ok(resp) = client.get(url).send().await else { return Vec::new(); };
    let Ok(json) = resp.json::<serde_json::Value>().await else { return Vec::new(); };

    let mut deals = Vec::new();
    if let Some(items) = json.get("specials").and_then(|s| s.get("items")).and_then(|i| i.as_array()) {
        for item in items.iter().take(12) {
            let id = item.get("id").and_then(|v| v.as_u64()).map(|n| n.to_string()).unwrap_or_default();
            let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let discount_pct = item.get("discount_percent").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let orig_cents = item.get("original_price").and_then(|v| v.as_i64()).unwrap_or(0);
            let final_cents = item.get("final_price").and_then(|v| v.as_i64()).unwrap_or(0);
            let currency = item.get("currency").and_then(|v| v.as_str()).unwrap_or("USD");
            
            let banner = item.get("large_capsule_image")
                .or_else(|| item.get("header_image"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            if !id.is_empty() && !name.is_empty() && discount_pct > 0 {
                let orig_str = if currency == "USD" {
                    format!("${:.2}", orig_cents as f64 / 100.0)
                } else {
                    format!("{:.2} {}", orig_cents as f64 / 100.0, currency)
                };
                let final_str = if final_cents == 0 {
                    "Ücretsiz".into()
                } else if currency == "USD" {
                    format!("${:.2}", final_cents as f64 / 100.0)
                } else {
                    format!("{:.2} {}", final_cents as f64 / 100.0, currency)
                };

                deals.push(GameDealItem {
                    id: format!("steam_{id}"),
                    title: name,
                    store: "steam".into(),
                    original_price: Some(orig_str),
                    final_price: final_str,
                    discount_percent: discount_pct,
                    is_free: final_cents == 0,
                    banner_url: banner,
                    store_url: format!("https://store.steampowered.com/app/{id}"),
                    expiry_date: None,
                });
            }
        }
    }
    deals
}

/// Epic Games haftalık ücretsiz oyunlarını çeker
pub async fn fetch_epic_free_games() -> Vec<GameDealItem> {
    let client = reqwest::Client::builder()
        .user_agent("sonsus-engine/1.0.0")
        .timeout(Duration::from_secs(6))
        .build();

    let Ok(client) = client else { return Vec::new(); };

    let url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=tr&country=TR&allowCountries=TR";
    let Ok(resp) = client.get(url).send().await else { return Vec::new(); };
    let Ok(json) = resp.json::<serde_json::Value>().await else { return Vec::new(); };

    let mut deals = Vec::new();
    if let Some(elements) = json
        .get("data")
        .and_then(|d| d.get("Catalog"))
        .and_then(|c| c.get("searchStore"))
        .and_then(|s| s.get("elements"))
        .and_then(|e| e.as_array())
    {
        for el in elements {
            let promos = el.get("promotions");
            let has_active_promo = promos
                .and_then(|p| p.get("promotionalOffers"))
                .and_then(|po| po.as_array())
                .map(|arr| !arr.is_empty())
                .unwrap_or(false);

            if has_active_promo {
                let title = el.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let id = el.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let slug = el.get("productSlug")
                    .or_else(|| el.get("urlSlug"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                let mut banner = String::new();
                if let Some(key_images) = el.get("keyImages").and_then(|k| k.as_array()) {
                    for img in key_images {
                        let t = img.get("type").and_then(|v| v.as_str()).unwrap_or("");
                        if t == "OfferImageWide" || t == "DieselStoreFrontWide" || t == "Thumbnail" {
                            if let Some(u) = img.get("url").and_then(|v| v.as_str()) {
                                banner = u.to_string();
                                break;
                            }
                        }
                    }
                }

                if !title.is_empty() {
                    deals.push(GameDealItem {
                        id: format!("epic_{id}"),
                        title,
                        store: "epic".into(),
                        original_price: None,
                        final_price: "ÜCRETSİZ".into(),
                        discount_percent: 100,
                        is_free: true,
                        banner_url: banner,
                        store_url: if !slug.is_empty() {
                            format!("https://store.epicgames.com/tr/p/{slug}")
                        } else {
                            "https://store.epicgames.com/tr/free-games".into()
                        },
                        expiry_date: Some("Bu Haftanın Ücretsiz Oyunu".into()),
                    });
                }
            }
        }
    }
    deals
}

pub async fn get_all_curated_deals() -> Vec<GameDealItem> {
    let (steam, epic) = tokio::join!(fetch_steam_specials(), fetch_epic_free_games());
    let mut all = epic;
    all.extend(steam);
    all
}

