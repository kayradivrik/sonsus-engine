//! İnternet ve yerel manifestler üzerinden oyun açıklaması, indirme/kurulum boyutu,
//! minimum/önerilen sistem gereksinimleri, ProtonDB Linux derecesi ve gerçek oyuncu incelemelerini çeker.

use crate::{
    db::{load_cached_online_details, save_cached_online_details},
    launcher::has_binary,
    models::{OnlineGameDetails, Platform, PlayerReview, UnifiedGame},
};
use std::{path::Path, time::Duration};
use tokio::process::Command as TokioCommand;

const CACHE_TTL_SECS: i64 = 7 * 24 * 3600; // 7 gün

#[derive(Default)]
struct EpicManifestProbe {
    download_size_bytes: Option<u64>,
    install_size_bytes: Option<u64>,
    build_version: Option<String>,
    cloud_saves_supported: Option<bool>,
}

fn build_http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (X11; Linux x86_64) KRNLLauncher/0.3")
        .timeout(Duration::from_secs(7))
        .build()
        .map_err(|e| e.to_string())
}

fn url_encode_query(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' => (b as char).to_string(),
            b' ' => "%20".to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect()
}

fn strip_html_tags(input: &str) -> String {
    let with_newlines = input
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n")
        .replace("</li>", "\n")
        .replace("</p>", "\n");

    let mut out = String::with_capacity(with_newlines.len());
    let mut in_tag = false;
    for ch in with_newlines.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }

    let decoded = out
        .replace("&quot;", "\"")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ");

    let mut clean_lines: Vec<&str> = Vec::new();
    for line in decoded.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if clean_lines.last().copied() != Some("") {
                clean_lines.push("");
            }
        } else {
            clean_lines.push(trimmed);
        }
    }
    clean_lines.join("\n").trim().to_string()
}

/// Sistem gereksinimleri metninden ("Depolama: 65 GB" / "Storage: 500 MB") tahmini disk boyutunu çıkarır
fn parse_storage_bytes_from_requirements(req_text: &str) -> Option<u64> {
    for line in req_text.lines() {
        let lower = line.to_lowercase();
        if lower.contains("depolama")
            || lower.contains("storage")
            || lower.contains("disk")
            || lower.contains("alan")
        {
            let tokens: Vec<&str> = line
                .split(|c: char| !c.is_ascii_alphanumeric() && c != '.' && c != ',')
                .filter(|s| !s.is_empty())
                .collect();
            for win in tokens.windows(2) {
                let num_str = win[0].replace(',', ".");
                if let Ok(val) = num_str.parse::<f64>() {
                    let unit = win[1].to_uppercase();
                    let mult = match unit.as_str() {
                        "GB" | "GIB" => Some(1024.0 * 1024.0 * 1024.0),
                        "MB" | "MIB" => Some(1024.0 * 1024.0),
                        _ => None,
                    };
                    if let Some(m) = mult {
                        if val > 0.0 {
                            return Some((val * m) as u64);
                        }
                    }
                }
            }
        }
    }
    None
}

/// Epic Games oyunları için kurulu olmasa dahi Legendary manifestinden gerçek indirme ve kurulum boyutunu sorgular
async fn probe_epic_manifest(game: &UnifiedGame) -> EpicManifestProbe {
    if game.platform != Platform::Epic {
        return EpicManifestProbe::default();
    }

    let bin = if has_binary("legendary") {
        Some("legendary")
    } else if Path::new("/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/legendary")
        .exists()
    {
        Some("/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/legendary")
    } else {
        None
    };

    let Some(legendary_bin) = bin else {
        return EpicManifestProbe::default();
    };

    let mut cmd = TokioCommand::new(legendary_bin);
    cmd.args(["info", &game.platform_id, "--json"]);

    if let Some(cfg) = dirs::config_dir() {
        let heroic_xdg = cfg.join("heroic/legendaryConfig");
        if heroic_xdg.exists() && !cfg.join("legendary/user.json").exists() {
            cmd.env("XDG_CONFIG_HOME", &heroic_xdg);
        }
    }

    let Ok(Ok(output)) = tokio::time::timeout(Duration::from_secs(5), cmd.output()).await else {
        return EpicManifestProbe::default();
    };
    if !output.status.success() {
        return EpicManifestProbe::default();
    }

    let Ok(json) = serde_json::from_slice::<serde_json::Value>(&output.stdout) else {
        return EpicManifestProbe::default();
    };

    EpicManifestProbe {
        download_size_bytes: json
            .get("manifest")
            .and_then(|m| m.get("download_size"))
            .and_then(|v| v.as_u64()),
        install_size_bytes: json
            .get("manifest")
            .and_then(|m| m.get("disk_size"))
            .and_then(|v| v.as_u64()),
        build_version: json
            .get("game")
            .and_then(|g| g.get("version"))
            .and_then(|v| v.as_str())
            .map(ToOwned::to_owned),
        cloud_saves_supported: json
            .get("game")
            .and_then(|g| g.get("cloud_saves_supported"))
            .and_then(|v| v.as_bool()),
    }
}

async fn resolve_steam_appid(client: &reqwest::Client, game: &UnifiedGame) -> Option<u64> {
    if game.platform == Platform::Steam {
        if let Ok(id) = game.platform_id.parse::<u64>() {
            return Some(id);
        }
    }

    let url = format!(
        "https://store.steampowered.com/api/storesearch/?term={}&l=turkish&cc=US",
        url_encode_query(&game.title)
    );
    let resp = client.get(&url).send().await.ok()?;
    let json: serde_json::Value = resp.json().await.ok()?;
    json["items"].get(0)?.get("id")?.as_u64()
}

async fn fetch_protondb_summary(
    client: &reqwest::Client,
    appid: u64,
) -> (Option<String>, Option<u32>) {
    let url = format!("https://www.protondb.com/api/v1/reports/summaries/{appid}.json");
    let Ok(resp) = client.get(&url).send().await else {
        return (None, None);
    };
    let Ok(json) = resp.json::<serde_json::Value>().await else {
        return (None, None);
    };
    let tier = json
        .get("tier")
        .or_else(|| json.get("trendingTier"))
        .and_then(|v| v.as_str())
        .map(ToOwned::to_owned);
    let total = json
        .get("total")
        .and_then(|v| v.as_u64())
        .map(|n| n as u32);
    (tier, total)
}

async fn fetch_community_reviews(client: &reqwest::Client, appid: u64) -> Vec<PlayerReview> {
    let mut reviews = fetch_community_reviews_lang(client, appid, "turkish").await;
    if reviews.len() < 3 {
        let fallback = fetch_community_reviews_lang(client, appid, "english").await;
        for r in fallback {
            if reviews.len() >= 6 {
                break;
            }
            if !reviews.iter().any(|x| x.content == r.content) {
                reviews.push(r);
            }
        }
    }
    reviews
}

async fn fetch_community_reviews_lang(
    client: &reqwest::Client,
    appid: u64,
    lang: &str,
) -> Vec<PlayerReview> {
    let url = format!(
        "https://steamcommunity.com/app/{appid}/homecontent/?userreviewsoffset=0&p=1&numperpage=6&browsefilter=toprated&appid={appid}&appHubSubSection=10&l={lang}&filterLanguage=default"
    );
    let Ok(resp) = client.get(&url).send().await else {
        return Vec::new();
    };
    let Ok(html) = resp.text().await else {
        return Vec::new();
    };

    parse_community_review_cards(&html)
}

fn extract_between<'a>(haystack: &'a str, start_pat: &str, end_pat: &str) -> Option<&'a str> {
    let start = haystack.find(start_pat)? + start_pat.len();
    let rest = &haystack[start..];
    let end = rest.find(end_pat)?;
    Some(&rest[..end])
}

fn parse_community_review_cards(html: &str) -> Vec<PlayerReview> {
    let mut out = Vec::new();
    for chunk in html.split("apphub_UserReviewCardContent").skip(1) {
        let card_end = chunk
            .find("UserReviewCardContent_Footer")
            .unwrap_or(chunk.len());
        let body_section = &chunk[..card_end];

        let recommended = body_section.contains("icon_thumbsUp");

        let helpful_raw = extract_between(body_section, "found_helpful\">", "<div").unwrap_or("");
        let helpful_text = strip_html_tags(helpful_raw)
            .lines()
            .next()
            .unwrap_or("")
            .to_string();

        let hours_played = extract_between(body_section, "<div class=\"hours\">", "</div>")
            .map(strip_html_tags)
            .unwrap_or_default();

        let date_posted = extract_between(body_section, "<div class=\"date_posted\">", "</div>")
            .map(strip_html_tags)
            .unwrap_or_default();

        let content = if let Some(text_block) =
            extract_between(body_section, "apphub_CardTextContent\">", "</div>\n\t\t</div>")
                .or_else(|| body_section.split("apphub_CardTextContent\">").nth(1))
        {
            let after_date = if let Some(idx) = text_block.find("</div>") {
                &text_block[idx + 6..]
            } else {
                text_block
            };
            let cleaned = strip_html_tags(after_date);
            cleaned.chars().take(520).collect::<String>()
        } else {
            String::new()
        };

        let author = extract_between(chunk, "apphub_CardContentAuthorName", "</div>")
            .and_then(|s| s.split('>').nth(1))
            .map(strip_html_tags)
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "Oyuncu".to_string());

        if !content.is_empty() {
            out.push(PlayerReview {
                author,
                recommended,
                hours_played,
                date_posted,
                helpful_text,
                content,
            });
        }
        if out.len() >= 6 {
            break;
        }
    }
    out
}

pub async fn fetch_online_game_details(
    game: &UnifiedGame,
    force_refresh: bool,
) -> Result<OnlineGameDetails, String> {
    let cache_key = format!("v2:{}", game.id);
    if !force_refresh {
        if let Some(cached) = load_cached_online_details(&cache_key, CACHE_TTL_SECS) {
            return Ok(cached);
        }
    }

    let client = build_http_client()?;
    let (appid_opt, epic_probe) = tokio::join!(
        resolve_steam_appid(&client, game),
        probe_epic_manifest(game),
    );

    let mut details = OnlineGameDetails {
        resolved_steam_appid: appid_opt,
        download_size_bytes: epic_probe.download_size_bytes,
        install_size_bytes: epic_probe.install_size_bytes.or(game.size_bytes),
        build_version: epic_probe.build_version,
        cloud_saves_supported: epic_probe.cloud_saves_supported,
        ..Default::default()
    };

    if let Some(appid) = appid_opt {
        let appdetails_url =
            format!("https://store.steampowered.com/api/appdetails?appids={appid}&l=turkish");

        let (appdetails_res, proton_res, reviews) = tokio::join!(
            client.get(&appdetails_url).send(),
            fetch_protondb_summary(&client, appid),
            fetch_community_reviews(&client, appid),
        );

        details.protondb_tier = proton_res.0;
        details.protondb_total = proton_res.1;
        details.hero_url = Some(format!(
            "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{appid}/library_hero.jpg"
        ));
        details.reviews = reviews;

        if let Ok(resp) = appdetails_res {
            if let Ok(root) = resp.json::<serde_json::Value>().await {
                let key = appid.to_string();
                if let Some(data) = root.get(&key).and_then(|v| v.get("data")) {
                    details.short_description = data
                        .get("short_description")
                        .and_then(|v| v.as_str())
                        .map(strip_html_tags)
                        .filter(|s| !s.is_empty());

                    details.developers = data
                        .get("developers")
                        .and_then(|v| v.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|x| x.as_str().map(ToOwned::to_owned))
                                .collect()
                        })
                        .unwrap_or_default();

                    details.publishers = data
                        .get("publishers")
                        .and_then(|v| v.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|x| x.as_str().map(ToOwned::to_owned))
                                .collect()
                        })
                        .unwrap_or_default();

                    details.release_date = data
                        .get("release_date")
                        .and_then(|v| v.get("date"))
                        .and_then(|v| v.as_str())
                        .map(ToOwned::to_owned);

                    details.metacritic_score = data
                        .get("metacritic")
                        .and_then(|v| v.get("score"))
                        .and_then(|v| v.as_u64())
                        .map(|n| n as u32);

                    if let Some(langs) = data.get("supported_languages").and_then(|v| v.as_str()) {
                        let lower = langs.to_lowercase();
                        details.has_turkish =
                            lower.contains("türkçe") || lower.contains("turkish");
                    }

                    details.controller_support = data
                        .get("controller_support")
                        .and_then(|v| v.as_str())
                        .map(|c| match c {
                            "full" => "Tam Kontrolcü Desteği".to_string(),
                            "partial" => "Kısmi Kontrolcü Desteği".to_string(),
                            other => other.to_string(),
                        });

                    // Steam kategorilerinden Steam Cloud (id == 23) desteği kontrolü
                    if details.cloud_saves_supported.is_none() {
                        if let Some(cats) = data.get("categories").and_then(|v| v.as_array()) {
                            let has_cloud = cats
                                .iter()
                                .any(|c| c.get("id").and_then(|i| i.as_u64()) == Some(23));
                            if has_cloud {
                                details.cloud_saves_supported = Some(true);
                            }
                        }
                    }

                    details.screenshots = data
                        .get("screenshots")
                        .and_then(|v| v.as_array())
                        .map(|arr| {
                            arr.iter()
                                .take(6)
                                .filter_map(|s| {
                                    s.get("path_full")
                                        .or_else(|| s.get("path_thumbnail"))
                                        .and_then(|v| v.as_str())
                                        .map(ToOwned::to_owned)
                                })
                                .collect()
                        })
                        .unwrap_or_default();

                    details.minimum_requirements = data
                        .get("pc_requirements")
                        .and_then(|v| v.get("minimum"))
                        .and_then(|v| v.as_str())
                        .map(strip_html_tags)
                        .filter(|s| !s.is_empty());

                    details.recommended_requirements = data
                        .get("pc_requirements")
                        .and_then(|v| v.get("recommended"))
                        .and_then(|v| v.as_str())
                        .map(strip_html_tags)
                        .filter(|s| !s.is_empty());

                    details.linux_requirements = data
                        .get("linux_requirements")
                        .and_then(|v| v.get("minimum"))
                        .and_then(|v| v.as_str())
                        .map(strip_html_tags)
                        .filter(|s| !s.is_empty());

                    // Kurulum boyutu bilinmiyorsa sistem gereksinimlerindeki "Depolama: XX GB" satırından çıkar
                    if details.install_size_bytes.is_none() {
                        details.install_size_bytes = details
                            .recommended_requirements
                            .as_deref()
                            .and_then(parse_storage_bytes_from_requirements)
                            .or_else(|| {
                                details
                                    .minimum_requirements
                                    .as_deref()
                                    .and_then(parse_storage_bytes_from_requirements)
                            });
                    }
                }
            }
        }
    }

    save_cached_online_details(&cache_key, &details);
    Ok(details)
}
