use crate::models::{AppSettings, HookProfile, OnlineGameDetails, UnifiedGame};
use rusqlite::{params, Connection};
use std::{collections::HashMap, fs, path::PathBuf};

pub fn app_data_dir() -> Result<PathBuf, String> {
    let root = dirs::data_local_dir()
        .or_else(dirs::config_dir)
        .ok_or_else(|| "Veri dizini bulunamadı".to_string())?;
    let base = root.join("sonsus-engine");
    fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    Ok(base)
}

pub fn db_path() -> Result<PathBuf, String> {
    let base = app_data_dir()?;
    let db_file = base.join("library.db");

    // Eski `krnl-launcher` veritabanı varsa ayarları ve önbelleği kaybetmemek için tek seferlik taşı
    if !db_file.exists() {
        if let Some(root) = base.parent() {
            let legacy = root.join("krnl-launcher/library.db");
            if legacy.exists() {
                let _ = fs::copy(&legacy, &db_file);
            }
        }
    }

    Ok(db_file)
}

pub fn open_db() -> Result<Connection, String> {
    let path = db_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.busy_timeout(std::time::Duration::from_secs(5))
        .map_err(|e| e.to_string())?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        CREATE TABLE IF NOT EXISTS cached_games (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS kv_store (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS game_hooks (
            game_id TEXT PRIMARY KEY,
            profile_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS metadata_cache (
            game_id TEXT PRIMARY KEY,
            fetched_at INTEGER NOT NULL,
            details_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_game_prefs (
            game_id TEXT PRIMARY KEY,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_hidden INTEGER NOT NULL DEFAULT 0,
            collection_tag TEXT
        );
        CREATE TABLE IF NOT EXISTS custom_games (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL
        );",
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

pub fn load_all_game_prefs() -> HashMap<String, (bool, bool, Option<String>)> {
    let mut map = HashMap::new();
    let Ok(conn) = open_db() else {
        return map;
    };
    let Ok(mut stmt) = conn.prepare(
        "SELECT game_id, is_favorite, is_hidden, collection_tag FROM user_game_prefs",
    ) else {
        return map;
    };
    if let Ok(rows) = stmt.query_map([], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, i64>(1)? != 0,
            r.get::<_, i64>(2)? != 0,
            r.get::<_, Option<String>>(3)?,
        ))
    }) {
        for (id, fav, hid, tag) in rows.flatten() {
            map.insert(id, (fav, hid, tag));
        }
    }
    map
}

pub fn apply_prefs_to_games(games: &mut [UnifiedGame]) {
    let prefs = load_all_game_prefs();
    if prefs.is_empty() {
        return;
    }
    for g in games.iter_mut() {
        if let Some((fav, hid, tag)) = prefs.get(&g.id) {
            g.is_favorite = *fav;
            g.is_hidden = *hid;
            g.collection_tag = tag.clone();
        }
    }
}

pub fn save_game_pref(
    game_id: &str,
    is_favorite: bool,
    is_hidden: bool,
    collection_tag: Option<&str>,
) -> Result<(), String> {
    let conn = open_db()?;
    let clean_tag = collection_tag.map(str::trim).filter(|s| !s.is_empty());
    conn.execute(
        "INSERT OR REPLACE INTO user_game_prefs (game_id, is_favorite, is_hidden, collection_tag)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            game_id,
            if is_favorite { 1i64 } else { 0i64 },
            if is_hidden { 1i64 } else { 0i64 },
            clean_tag
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_custom_games() -> Vec<UnifiedGame> {
    let Ok(conn) = open_db() else {
        return Vec::new();
    };
    let Ok(mut stmt) = conn.prepare("SELECT payload FROM custom_games") else {
        return Vec::new();
    };
    let Ok(rows) = stmt.query_map([], |row| row.get::<_, String>(0)) else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for r in rows.flatten() {
        if let Ok(game) = serde_json::from_str::<UnifiedGame>(&r) {
            out.push(game);
        }
    }
    out
}

pub fn save_custom_game(game: &UnifiedGame) -> Result<(), String> {
    let conn = open_db()?;
    let json = serde_json::to_string(game).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO custom_games (id, payload) VALUES (?1, ?2)",
        params![game.id, json],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_custom_game(game_id: &str) -> Result<(), String> {
    let conn = open_db()?;
    conn.execute("DELETE FROM custom_games WHERE id = ?1", params![game_id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM cached_games WHERE id = ?1", params![game_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_cached_games() -> Result<Vec<UnifiedGame>, String> {
    let conn = open_db()?;
    let mut stmt = conn
        .prepare("SELECT payload FROM cached_games")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows.flatten() {
        if let Ok(game) = serde_json::from_str::<UnifiedGame>(&r) {
            out.push(game);
        }
    }
    apply_prefs_to_games(&mut out);
    out.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    Ok(out)
}

pub fn save_cached_games(games: &[UnifiedGame]) -> Result<(), String> {
    let mut conn = open_db()?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM cached_games", [])
        .map_err(|e| e.to_string())?;
    {
        let mut stmt = tx
            .prepare("INSERT INTO cached_games (id, payload) VALUES (?1, ?2)")
            .map_err(|e| e.to_string())?;
        for g in games {
            if let Ok(json) = serde_json::to_string(g) {
                let _ = stmt.execute(params![g.id, json]);
            }
        }
    }
    tx.commit().map_err(|e| e.to_string())
}

pub fn update_single_cached_game(game: &UnifiedGame) -> Result<(), String> {
    let conn = open_db()?;
    let json = serde_json::to_string(game).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO cached_games (id, payload) VALUES (?1, ?2)",
        params![game.id, json],
    )
    .map_err(|e| e.to_string())?;
    if game.platform == crate::models::Platform::Custom {
        let _ = save_custom_game(game);
    }
    Ok(())
}

pub fn load_settings() -> AppSettings {
    let Ok(conn) = open_db() else {
        return AppSettings::default();
    };
    let Ok(raw) = conn.query_row(
        "SELECT value FROM kv_store WHERE key = 'app_settings'",
        [],
        |r| r.get::<_, String>(0),
    ) else {
        return AppSettings::default();
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let conn = open_db()?;
    let json = serde_json::to_string(settings).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO kv_store (key, value) VALUES ('app_settings', ?1)",
        params![json],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_game_hook(game_id: &str) -> Option<HookProfile> {
    let conn = open_db().ok()?;
    let raw: String = conn
        .query_row(
            "SELECT profile_json FROM game_hooks WHERE game_id = ?1",
            params![game_id],
            |r| r.get(0),
        )
        .ok()?;
    serde_json::from_str(&raw).ok()
}

pub fn save_game_hook(game_id: &str, profile: Option<&HookProfile>) -> Result<(), String> {
    let conn = open_db()?;
    match profile {
        Some(p) => {
            let json = serde_json::to_string(p).map_err(|e| e.to_string())?;
            conn.execute(
                "INSERT OR REPLACE INTO game_hooks (game_id, profile_json) VALUES (?1, ?2)",
                params![game_id, json],
            )
            .map_err(|e| e.to_string())?;
        }
        None => {
            conn.execute("DELETE FROM game_hooks WHERE game_id = ?1", params![game_id])
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn load_cached_online_details(game_id: &str, max_age_secs: i64) -> Option<OnlineGameDetails> {
    let conn = open_db().ok()?;
    let (fetched_at, raw): (i64, String) = conn
        .query_row(
            "SELECT fetched_at, details_json FROM metadata_cache WHERE game_id = ?1",
            params![game_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .ok()?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    if now - fetched_at > max_age_secs {
        return None;
    }
    serde_json::from_str(&raw).ok()
}

pub fn save_cached_online_details(game_id: &str, details: &OnlineGameDetails) {
    let Ok(conn) = open_db() else { return };
    let Ok(json) = serde_json::to_string(details) else { return };
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let _ = conn.execute(
        "INSERT OR REPLACE INTO metadata_cache (game_id, fetched_at, details_json) VALUES (?1, ?2, ?3)",
        params![game_id, now, json],
    );
}
