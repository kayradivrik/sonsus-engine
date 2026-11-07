//! Çok kaynaklı (Epic Store API + GOG API + GOGDB + Legendary Manifest + Steam + ProtonDB)
//! oyun detayları, sistem gereksinimleri, indirme/kurulum boyutu ve oyuncu incelemesi motoru.

use crate::{
    db::{load_cached_online_details, save_cached_online_details, update_single_cached_game},
    models::{OnlineGameDetails, Platform, PlayerReview, UnifiedGame},
    parsers::epic::{find_legendary_binary_path, normalize_genre_label},
};
use std::time::Duration;
use tokio::process::Command as TokioCommand;

const CACHE_TTL_SECS: i64 = 7 * 24 * 3600;

#[derive(Default)]
struct EpicManifestProbe {
    download_size_bytes: Option<u64>,
    install_size_bytes: Option<u64>,
    build_version: Option<String>,
    cloud_saves_supported: Option<bool>,
}

#[derive(Default)]
struct StoreSpecificMeta {
    description: Option<String>,
    developers: Vec<String>,
    publishers: Vec<String>,
    release_date: Option<String>,
    critic_score: Option<u32>,
    hero_url: Option<String>,
    screenshots: Vec<String>,
    genres: Vec<String>,
    has_turkish: bool,
    minimum_requirements: Option<String>,
    recommended_requirements: Option<String>,
    linux_requirements: Option<String>,
}

fn build_http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (X11; Linux x86_64) SonsusEngine/0.2")
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

fn slugify_title(title: &str) -> String {
    let mut out = String::new();
    let mut prev_dash = false;
    for ch in title.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
            prev_dash = false;
        } else if (ch == ' ' || ch == '-' || ch == ':') && !prev_dash && !out.is_empty() {
            out.push('-');
            prev_dash = true;
        }
    }
    out.trim_matches('-').to_string()
}

fn strip_html_and_markdown(input: &str) -> String {
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

    let mut clean_lines: Vec<String> = Vec::new();
    for line in decoded.lines() {
        let trimmed = line.trim();
        // Markdown alt çizgi başlık ayraçlarını (`=====` / `-----`) temizle
        if !trimmed.is_empty() && trimmed.chars().all(|c| c == '=' || c == '-') {
            continue;
        }
        let no_md = trimmed.trim_start_matches('#').trim();
        if no_md.is_empty() {
            if clean_lines.last().map(String::as_str) != Some("") {
                clean_lines.push(String::new());
            }
        } else {
            clean_lines.push(no_md.to_string());
        }
    }
    clean_lines.join("\n").trim().to_string()
}

fn parse_storage_bytes_from_requirements(req_text: &str) -> Option<u64> {
    for line in req_text.lines() {
        let lower = line.to_lowercase();
        if lower.contains("depolama")
            || lower.contains("storage")
            || lower.contains("disk")
            || lower.contains("alan")
            || lower.contains("space")
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

async fn probe_epic_manifest(game: &UnifiedGame) -> EpicManifestProbe {
    if game.platform != Platform::Epic {
        return EpicManifestProbe::default();
    }

    let Some(legendary_bin) = find_legendary_binary_path() else {
        return EpicManifestProbe::default();
    };

    let mut cmd = TokioCommand::new(legendary_bin);
    cmd.args(["info", &game.platform_id, "--json"]);

    #[cfg(windows)]
    {
        #[allow(unused_imports)]
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }

    if let Some(cfg) = dirs::config_dir() {
        let heroic_xdg = cfg.join("heroic/legendaryConfig");
        if heroic_xdg.exists() && !cfg.join("legendary/user.json").exists() {
            cmd.env("XDG_CONFIG_HOME", &heroic_xdg);
            cmd.env("LEGENDARY_CONFIG_PATH", heroic_xdg.join("legendary"));
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

/// GOGDB (`gamesdb.gog.com`) üzerinden hem Epic (`epic`) hem GOG (`gog`) oyunlarının
/// kesin `platform_id` ile özet, tür, geliştirici, ekran görüntüsü ve slug verisini çeker.
async fn fetch_gogdb_release(
    client: &reqwest::Client,
    platform_str: &str,
    external_id: &str,
) -> (StoreSpecificMeta, Option<String>) {
    let mut meta = StoreSpecificMeta::default();
    let url = format!(
        "https://gamesdb.gog.com/platforms/{platform_str}/external_releases/{external_id}"
    );
    let Ok(resp) = client.get(&url).send().await else {
        return (meta, None);
    };
    if !resp.status().is_success() {
        return (meta, None);
    }
    let Ok(json) = resp.json::<serde_json::Value>().await else {
        return (meta, None);
    };

    let game_obj = json.get("game");

    meta.description = json
        .get("summary")
        .or_else(|| game_obj.and_then(|g| g.get("summary")))
        .and_then(|s| s.get("tr-TR").or_else(|| s.get("*")).or_else(|| s.get("en-US")))
        .and_then(|v| v.as_str())
        .map(strip_html_and_markdown)
        .filter(|s| !s.is_empty());

    let discovered_slug = game_obj
        .and_then(|g| g.get("slug"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(ToOwned::to_owned);

    if let Some(langs) = json.get("available_languages").and_then(|v| v.as_array()) {
        meta.has_turkish = langs.iter().any(|l| {
            l.get("code")
                .and_then(|c| c.as_str())
                .map(|c| c.starts_with("tr"))
                .unwrap_or(false)
        });
    }

    if let Some(date_str) = json
        .get("first_release_date")
        .or_else(|| game_obj.and_then(|g| g.get("first_release_date")))
        .and_then(|v| v.as_str())
    {
        meta.release_date = date_str.split('T').next().map(ToOwned::to_owned);
    }

    if let Some(g) = game_obj {
        if let Some(score) = g.get("aggregated_rating").and_then(|v| v.as_f64()) {
            if score > 0.0 {
                meta.critic_score = Some(score.round() as u32);
            }
        }

        if let Some(devs) = g.get("developers").and_then(|v| v.as_array()) {
            meta.developers = devs
                .iter()
                .filter_map(|d| d.get("name").and_then(|v| v.as_str()).map(ToOwned::to_owned))
                .collect();
        }
        if let Some(pubs) = g.get("publishers").and_then(|v| v.as_array()) {
            meta.publishers = pubs
                .iter()
                .filter_map(|p| p.get("name").and_then(|v| v.as_str()).map(ToOwned::to_owned))
                .collect();
        }

        if let Some(genres_arr) = g.get("genres").and_then(|v| v.as_array()) {
            for g_item in genres_arr {
                if let Some(raw_name) = g_item
                    .get("name")
                    .and_then(|n| n.get("*").or_else(|| n.get("en-US")))
                    .and_then(|v| v.as_str())
                {
                    if let Some(norm) = normalize_genre_label(raw_name) {
                        if !meta.genres.iter().any(|x| x == norm) {
                            meta.genres.push(norm.to_string());
                        }
                    }
                }
            }
        }

        if let Some(bg_id) = g
            .get("background")
            .and_then(|b| b.get("url_format"))
            .and_then(|v| v.as_str())
        {
            meta.hero_url = Some(
                bg_id
                    .replace("{formatter}", "")
                    .replace("{ext}", "jpg"),
            );
        }

        if let Some(shots) = g.get("screenshots").and_then(|v| v.as_array()) {
            meta.screenshots = shots
                .iter()
                .take(6)
                .filter_map(|s| {
                    s.get("url_format")
                        .and_then(|v| v.as_str())
                        .map(|u| u.replace("{formatter}", "").replace("{ext}", "jpg"))
                })
                .collect();
        }
    }

    (meta, discovered_slug)
}

/// Epic Games Resmi Store Content API'sinden (`store-content-ipv4.ak.epicgames.com`)
/// Türkçe açıklama ve yapılandırılmış Minimum / Önerilen sistem gereksinimlerini çeker.
async fn fetch_epic_store_product(client: &reqwest::Client, slug: &str) -> StoreSpecificMeta {
    let mut out = StoreSpecificMeta::default();
    if slug.trim().is_empty() {
        return out;
    }

    for locale in ["tr", "en-US"] {
        let url = format!(
            "https://store-content-ipv4.ak.epicgames.com/api/{locale}/content/products/{slug}"
        );
        let Ok(resp) = client.get(&url).send().await else {
            continue;
        };
        if !resp.status().is_success() {
            continue;
        }
        let Ok(json) = resp.json::<serde_json::Value>().await else {
            continue;
        };

        let page_data = json
            .get("pages")
            .and_then(|p| p.as_array())
            .and_then(|arr| {
                arr.iter()
                    .find(|page| page.get("_urlPattern").and_then(|u| u.as_str()) == Some("home"))
                    .or_else(|| arr.first())
            })
            .and_then(|p| p.get("data"));

        let Some(data) = page_data else {
            continue;
        };

        if let Some(about) = data.get("about") {
            out.description = about
                .get("shortDescription")
                .and_then(|v| v.as_str())
                .filter(|s| !s.trim().is_empty())
                .or_else(|| about.get("description").and_then(|v| v.as_str()))
                .map(strip_html_and_markdown)
                .filter(|s| !s.is_empty());

            if let Some(dev) = about
                .get("developerAttribution")
                .and_then(|v| v.as_str())
                .filter(|s| !s.trim().is_empty())
            {
                out.developers = vec![dev.to_string()];
            }
            if let Some(pub_name) = about
                .get("publisherAttribution")
                .and_then(|v| v.as_str())
                .filter(|s| !s.trim().is_empty())
            {
                out.publishers = vec![pub_name.to_string()];
            }
            if let Some(img) = about
                .get("image")
                .and_then(|i| i.get("src"))
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
            {
                out.hero_url = Some(img.to_string());
            }
        }

        if let Some(meta_block) = data.get("meta") {
            if let Some(rd) = meta_block.get("releaseDate").and_then(|v| v.as_str()) {
                out.release_date = rd.split('T').next().map(ToOwned::to_owned);
            }
            if let Some(tags) = meta_block.get("tags").and_then(|v| v.as_array()) {
                for t in tags {
                    if let Some(raw_t) = t.as_str() {
                        if let Some(norm) = normalize_genre_label(raw_t) {
                            if !out.genres.iter().any(|x| x == norm) {
                                out.genres.push(norm.to_string());
                            }
                        }
                    }
                }
            }
        }

        // Epic sistem gereksinimleri (`requirements.systems[].details[]`)
        if let Some(systems) = data
            .get("requirements")
            .and_then(|r| r.get("systems"))
            .and_then(|v| v.as_array())
        {
            for sys in systems {
                let sys_type = sys
                    .get("systemType")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Windows");
                let Some(details_arr) = sys.get("details").and_then(|v| v.as_array()) else {
                    continue;
                };

                let mut min_lines = Vec::new();
                let mut rec_lines = Vec::new();

                for item in details_arr {
                    let title = item
                        .get("title")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .trim();
                    if let Some(min_v) = item
                        .get("minimum")
                        .and_then(|v| v.as_str())
                        .map(str::trim)
                        .filter(|s| !s.is_empty())
                    {
                        if title.is_empty() {
                            min_lines.push(min_v.trim_matches('"').to_string());
                        } else {
                            min_lines.push(format!("{title}: {}", min_v.trim_matches('"')));
                        }
                    }
                    if let Some(rec_v) = item
                        .get("recommended")
                        .and_then(|v| v.as_str())
                        .map(str::trim)
                        .filter(|s| !s.is_empty())
                    {
                        if title.is_empty() {
                            rec_lines.push(rec_v.trim_matches('"').to_string());
                        } else {
                            rec_lines.push(format!("{title}: {}", rec_v.trim_matches('"')));
                        }
                    }
                }

                if sys_type.eq_ignore_ascii_case("Linux") && !min_lines.is_empty() {
                    out.linux_requirements = Some(min_lines.join("\n"));
                } else if out.minimum_requirements.is_none() && !min_lines.is_empty() {
                    out.minimum_requirements = Some(min_lines.join("\n"));
                    if !rec_lines.is_empty() {
                        out.recommended_requirements = Some(rec_lines.join("\n"));
                    }
                }
            }
        }

        if out.description.is_some() || out.minimum_requirements.is_some() {
            break;
        }
    }

    out
}

/// GOG Resmi v2 API'sinden (`api.gog.com/v2/games/{id}`) açıklama ve sistem gereksinimlerini çeker.
async fn fetch_gog_official_v2(client: &reqwest::Client, gog_id: &str) -> StoreSpecificMeta {
    let mut out = StoreSpecificMeta::default();
    let url = format!("https://api.gog.com/v2/games/{gog_id}?locale=en-US");
    let Ok(resp) = client.get(&url).send().await else {
        return out;
    };
    if !resp.status().is_success() {
        return out;
    }
    let Ok(json) = resp.json::<serde_json::Value>().await else {
        return out;
    };

    out.description = json
        .get("description")
        .and_then(|v| v.as_str())
        .map(strip_html_and_markdown)
        .filter(|s| !s.is_empty());

    if let Some(emb) = json.get("_embedded") {
        if let Some(os_list) = emb
            .get("supportedOperatingSystems")
            .and_then(|v| v.as_array())
        {
            for os_entry in os_list {
                let os_name = os_entry
                    .get("operatingSystem")
                    .and_then(|o| o.get("name"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let Some(reqs_arr) = os_entry.get("systemRequirements").and_then(|v| v.as_array())
                else {
                    continue;
                };

                for req_group in reqs_arr {
                    let r_type = req_group
                        .get("type")
                        .and_then(|v| v.as_str())
                        .unwrap_or("minimum");
                    let mut lines = Vec::new();
                    if let Some(desc) = req_group.get("description").and_then(|v| v.as_str()) {
                        let clean = strip_html_and_markdown(desc);
                        if !clean.is_empty() {
                            lines.push(clean);
                        }
                    }
                    if let Some(items) = req_group.get("requirements").and_then(|v| v.as_array()) {
                        for it in items {
                            let k = it.get("name").and_then(|v| v.as_str()).unwrap_or("");
                            let val = it.get("description").and_then(|v| v.as_str()).unwrap_or("");
                            if !val.is_empty() {
                                if k.is_empty() {
                                    lines.push(val.to_string());
                                } else {
                                    lines.push(format!("{k}: {val}"));
                                }
                            }
                        }
                    }
                    if lines.is_empty() {
                        continue;
                    }
                    if os_name.eq_ignore_ascii_case("linux") && out.linux_requirements.is_none() {
                        out.linux_requirements = Some(lines.join("\n"));
                    } else if r_type == "recommended" && out.recommended_requirements.is_none() {
                        out.recommended_requirements = Some(lines.join("\n"));
                    } else if out.minimum_requirements.is_none() {
                        out.minimum_requirements = Some(lines.join("\n"));
                    }
                }
            }
        }
    }

    out
}

async fn resolve_steam_appid(client: &reqwest::Client, game: &UnifiedGame) -> Option<u64> {
    if game.platform == Platform::Steam {
        if let Ok(id) = game.platform_id.parse::<u64>() {
            return Some(id);
        }
    }

    // "Enhanced", "Game of the Year" gibi eklerle bulunamazsa yalın başlıkla da dene
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
    let total = json.get("total").and_then(|v| v.as_u64()).map(|n| n as u32);
    (tier, total)
}

async fn fetch_steamspy_metrics(
    client: &reqwest::Client,
    appid: u64,
) -> (Option<u64>, Option<u8>, Option<u64>) {
    let url = format!("https://steamspy.com/api.php?request=appdetails&appid={appid}");
    let Ok(resp) = client.get(&url).send().await else {
        return (None, None, None);
    };
    if !resp.status().is_success() {
        return (None, None, None);
    }
    let Ok(json) = resp.json::<serde_json::Value>().await else {
        return (None, None, None);
    };

    let ccu = json.get("ccu").and_then(|v| v.as_u64()).filter(|&n| n > 0);
    let pos = json.get("positive").and_then(|v| v.as_u64()).unwrap_or(0);
    let neg = json.get("negative").and_then(|v| v.as_u64()).unwrap_or(0);
    let rating = if pos + neg > 0 {
        Some(((pos * 100) / (pos + neg)).min(100) as u8)
    } else {
        None
    };
    let avg_forever_mins = json
        .get("average_forever")
        .and_then(|v| v.as_u64())
        .filter(|&m| m > 0);

    (ccu, rating, avg_forever_mins)
}

fn round_half_hour(val: f32) -> f32 {
    ((val * 2.0).round() / 2.0).max(0.5)
}

fn parse_hours_from_review_label(label: &str) -> Option<f32> {
    let mut num_buf = String::new();
    for ch in label.chars() {
        if ch.is_ascii_digit() || ch == '.' {
            num_buf.push(ch);
        } else if ch == ',' {
            // Binlik ayracı mı ondalık mı kontrol et
            continue;
        } else if !num_buf.is_empty() {
            break;
        }
    }
    let parsed = num_buf.parse::<f32>().ok()?;
    if (0.5..=2500.0).contains(&parsed) {
        Some(parsed)
    } else {
        None
    }
}

fn compute_playtime_estimates(
    reviews: &[PlayerReview],
    avg_forever_mins: Option<u64>,
) -> (Option<f32>, Option<f32>, Option<f32>) {
    let mut sample_hours: Vec<f32> = reviews
        .iter()
        .filter_map(|r| parse_hours_from_review_label(&r.hours_played))
        .collect();
    sample_hours.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    if let Some(avg_mins) = avg_forever_mins {
        let spy_avg = (avg_mins as f32 / 60.0).clamp(1.0, 400.0);
        if sample_hours.len() >= 3 {
            let p25 = sample_hours[sample_hours.len() / 4];
            let p50 = sample_hours[sample_hours.len() / 2];
            let p85 = sample_hours[(sample_hours.len() * 85) / 100];
            let main_h = round_half_hour(((p25 + spy_avg * 0.65) / 2.0).clamp(1.0, 250.0));
            let extra_h = round_half_hour(((p50 + spy_avg) / 2.0).max(main_h + 1.0));
            let comp_h = round_half_hour(p85.max(extra_h * 1.35).min(600.0));
            return (Some(main_h), Some(extra_h), Some(comp_h));
        }
        let main_h = round_half_hour((spy_avg * 0.65).max(1.0));
        let extra_h = round_half_hour(spy_avg.max(main_h + 1.0));
        let comp_h = round_half_hour((spy_avg * 1.75).max(extra_h + 2.0));
        return (Some(main_h), Some(extra_h), Some(comp_h));
    }

    if sample_hours.len() >= 2 {
        let p25 = sample_hours[sample_hours.len() / 4];
        let p50 = sample_hours[sample_hours.len() / 2];
        let p85 = sample_hours[(sample_hours.len() * 85) / 100];
        let main_h = round_half_hour(p25.clamp(1.0, 250.0));
        let extra_h = round_half_hour(p50.max(main_h + 1.0));
        let comp_h = round_half_hour(p85.max(extra_h * 1.3).min(600.0));
        return (Some(main_h), Some(extra_h), Some(comp_h));
    }

    (None, None, None)
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
        let helpful_text = strip_html_and_markdown(helpful_raw)
            .lines()
            .next()
            .unwrap_or("")
            .to_string();

        let hours_played = extract_between(body_section, "<div class=\"hours\">", "</div>")
            .map(strip_html_and_markdown)
            .unwrap_or_default();

        let date_posted = extract_between(body_section, "<div class=\"date_posted\">", "</div>")
            .map(strip_html_and_markdown)
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
            let cleaned = strip_html_and_markdown(after_date);
            cleaned.chars().take(520).collect::<String>()
        } else {
            String::new()
        };

        let author = extract_between(chunk, "apphub_CardContentAuthorName", "</div>")
            .and_then(|s| s.split('>').nth(1))
            .map(strip_html_and_markdown)
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
    let cache_key = format!("v4:{}", game.id);
    if !force_refresh {
        if let Some(cached) = load_cached_online_details(&cache_key, CACHE_TTL_SECS) {
            return Ok(cached);
        }
    }

    let client = build_http_client()?;

    // 1. Platformun kendi doğrudan mağaza kaynaklarını + Steam eşleşmesini paralel çalıştır
    let (appid_opt, epic_probe, gogdb_pair, gog_official) = tokio::join!(
        resolve_steam_appid(&client, game),
        probe_epic_manifest(game),
        async {
            match game.platform {
                Platform::Epic => fetch_gogdb_release(&client, "epic", &game.platform_id).await,
                Platform::Gog => fetch_gogdb_release(&client, "gog", &game.platform_id).await,
                Platform::Steam | Platform::Custom => (StoreSpecificMeta::default(), None),
            }
        },
        async {
            if game.platform == Platform::Gog {
                fetch_gog_official_v2(&client, &game.platform_id).await
            } else {
                StoreSpecificMeta::default()
            }
        }
    );

    let (gogdb_meta, gogdb_slug) = gogdb_pair;

    // Epic oyunu ise Resmi Epic Store Türkçe API'sini de (store_slug veya keşfedilen slug ile) sorgula
    let epic_store_meta = if game.platform == Platform::Epic {
        let candidate_slug = game
            .store_slug
            .clone()
            .or(gogdb_slug)
            .unwrap_or_else(|| slugify_title(&game.title));
        let mut m = fetch_epic_store_product(&client, &candidate_slug).await;
        if m.description.is_none() && m.minimum_requirements.is_none() {
            let fallback_slug = slugify_title(&game.title);
            if fallback_slug != candidate_slug {
                m = fetch_epic_store_product(&client, &fallback_slug).await;
            }
        }
        m
    } else {
        StoreSpecificMeta::default()
    };

    let mut details = OnlineGameDetails {
        resolved_steam_appid: appid_opt,
        short_description: epic_store_meta
            .description
            .or(gog_official.description)
            .or(gogdb_meta.description)
            .or_else(|| game.summary_hint.clone()),
        developers: if !epic_store_meta.developers.is_empty() {
            epic_store_meta.developers
        } else if !gogdb_meta.developers.is_empty() {
            gogdb_meta.developers
        } else {
            game.developer.iter().cloned().collect()
        },
        publishers: if !epic_store_meta.publishers.is_empty() {
            epic_store_meta.publishers
        } else {
            gogdb_meta.publishers
        },
        release_date: epic_store_meta.release_date.or(gogdb_meta.release_date),
        metacritic_score: gogdb_meta.critic_score,
        hero_url: epic_store_meta.hero_url.or(gogdb_meta.hero_url),
        screenshots: gogdb_meta.screenshots,
        genres: if !epic_store_meta.genres.is_empty() {
            epic_store_meta.genres
        } else if !gogdb_meta.genres.is_empty() {
            gogdb_meta.genres
        } else {
            game.genres.clone()
        },
        download_size_bytes: epic_probe.download_size_bytes,
        install_size_bytes: epic_probe.install_size_bytes.or(game.size_bytes),
        build_version: epic_probe.build_version,
        cloud_saves_supported: epic_probe.cloud_saves_supported,
        has_turkish: gogdb_meta.has_turkish,
        minimum_requirements: epic_store_meta
            .minimum_requirements
            .or(gog_official.minimum_requirements),
        recommended_requirements: epic_store_meta
            .recommended_requirements
            .or(gog_official.recommended_requirements),
        linux_requirements: epic_store_meta
            .linux_requirements
            .or(gog_official.linux_requirements),
        ..Default::default()
    };

    // 2. Steam + ProtonDB + SteamSpy + Oyuncu İncelemeleri Katmanı
    if let Some(appid) = appid_opt {
        let appdetails_url =
            format!("https://store.steampowered.com/api/appdetails?appids={appid}&l=turkish");

        let (appdetails_res, proton_res, reviews, spy_res) = tokio::join!(
            client.get(&appdetails_url).send(),
            fetch_protondb_summary(&client, appid),
            fetch_community_reviews(&client, appid),
            fetch_steamspy_metrics(&client, appid),
        );

        details.protondb_tier = proton_res.0;
        details.protondb_total = proton_res.1;
        details.live_players_ccu = spy_res.0;
        details.community_rating_percent = spy_res.1;
        let (main_h, extra_h, comp_h) = compute_playtime_estimates(&reviews, spy_res.2);
        details.estimated_main_hours = main_h;
        details.estimated_extra_hours = extra_h;
        details.estimated_completionist_hours = comp_h;
        details.reviews = reviews;

        if details.hero_url.is_none() {
            details.hero_url = Some(format!(
                "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{appid}/library_hero.jpg"
            ));
        }

        if let Ok(resp) = appdetails_res {
            if let Ok(root) = resp.json::<serde_json::Value>().await {
                let key = appid.to_string();
                if let Some(data) = root.get(&key).and_then(|v| v.get("data")) {
                    if details.short_description.is_none() || game.platform == Platform::Steam {
                        if let Some(desc) = data
                            .get("short_description")
                            .and_then(|v| v.as_str())
                            .map(strip_html_and_markdown)
                            .filter(|s| !s.is_empty())
                        {
                            details.short_description = Some(desc);
                        }
                    }

                    if details.developers.is_empty() {
                        details.developers = data
                            .get("developers")
                            .and_then(|v| v.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|x| x.as_str().map(ToOwned::to_owned))
                                    .collect()
                            })
                            .unwrap_or_default();
                    }

                    if details.publishers.is_empty() {
                        details.publishers = data
                            .get("publishers")
                            .and_then(|v| v.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|x| x.as_str().map(ToOwned::to_owned))
                                    .collect()
                            })
                            .unwrap_or_default();
                    }

                    if details.release_date.is_none() {
                        details.release_date = data
                            .get("release_date")
                            .and_then(|v| v.get("date"))
                            .and_then(|v| v.as_str())
                            .map(ToOwned::to_owned);
                    }

                    if let Some(mc) = data
                        .get("metacritic")
                        .and_then(|v| v.get("score"))
                        .and_then(|v| v.as_u64())
                    {
                        details.metacritic_score = Some(mc as u32);
                    }

                    if let Some(langs) = data.get("supported_languages").and_then(|v| v.as_str()) {
                        let lower = langs.to_lowercase();
                        if lower.contains("türkçe") || lower.contains("turkish") {
                            details.has_turkish = true;
                        }
                    }

                    if details.controller_support.is_none() {
                        details.controller_support = data
                            .get("controller_support")
                            .and_then(|v| v.as_str())
                            .map(|c| match c {
                                "full" => "Tam Kontrolcü Desteği".to_string(),
                                "partial" => "Kısmi Kontrolcü Desteği".to_string(),
                                other => other.to_string(),
                            });
                    }

                    if details.cloud_saves_supported.is_none() {
                        if let Some(cats) = data.get("categories").and_then(|v| v.as_array()) {
                            if cats
                                .iter()
                                .any(|c| c.get("id").and_then(|i| i.as_u64()) == Some(23))
                            {
                                details.cloud_saves_supported = Some(true);
                            }
                        }
                    }

                    if details.screenshots.is_empty() {
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
                    }

                    if details.minimum_requirements.is_none() {
                        details.minimum_requirements = data
                            .get("pc_requirements")
                            .and_then(|v| v.get("minimum"))
                            .and_then(|v| v.as_str())
                            .map(strip_html_and_markdown)
                            .filter(|s| !s.is_empty());
                    }

                    if details.recommended_requirements.is_none() {
                        details.recommended_requirements = data
                            .get("pc_requirements")
                            .and_then(|v| v.get("recommended"))
                            .and_then(|v| v.as_str())
                            .map(strip_html_and_markdown)
                            .filter(|s| !s.is_empty());
                    }

                    if details.linux_requirements.is_none() {
                        details.linux_requirements = data
                            .get("linux_requirements")
                            .and_then(|v| v.get("minimum"))
                            .and_then(|v| v.as_str())
                            .map(strip_html_and_markdown)
                            .filter(|s| !s.is_empty());
                    }
                }
            }
        }
    }

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

    // Keşfedilen yeni tür (genre) etiketleri varsa önbellekteki oyunu da zenginleştir
    if game.genres.is_empty() && !details.genres.is_empty() {
        let mut enriched = game.clone();
        enriched.genres = details.genres.clone();
        let _ = update_single_cached_game(&enriched);
    }

    save_cached_online_details(&cache_key, &details);
    Ok(details)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parsers::epic::scan_epic_all;

    #[tokio::test]
    async fn fetches_epic_game_description_and_requirements() {
        let epic_games = scan_epic_all();
        if epic_games.is_empty() {
            return;
        }
        // Özellikle Steam adı farklı olabilen bir Epic oyununu (örn. GTA V Enhanced) veya ilk Epic oyununu test et
        let sample = epic_games
            .iter()
            .find(|g| g.title.to_lowercase().contains("grand theft auto"))
            .or_else(|| epic_games.first())
            .cloned()
            .unwrap();

        let details = fetch_online_game_details(&sample, true)
            .await
            .expect("Epic detayları çekilmeli");

        assert!(
            details
                .short_description
                .as_deref()
                .map(|s| !s.is_empty())
                .unwrap_or(false),
            "Epic oyunu için açıklama dolu olmalı: {}",
            sample.title
        );
        assert!(
            details
                .minimum_requirements
                .as_deref()
                .map(|s| !s.is_empty())
                .unwrap_or(false),
            "Epic oyunu için minimum sistem gereksinimleri dolu olmalı: {}",
            sample.title
        );
    }
}
