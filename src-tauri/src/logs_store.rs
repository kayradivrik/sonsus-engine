//! Oyun Çalıştırma ve Çökme Günlüğü (Launch Log Store).
//!
//! Başlatılan oyunların çalıştırma komutunu, kullanılan Proton/Wine sürümünü,
//! Ultra FPS durumunu ve `stdout`/`stderr` çıktılarını halka tamponda (ring buffer) saklar.

use crate::models::LaunchLogEntry;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex, OnceLock,
};

const MAX_LOG_SESSIONS: usize = 30;

static NEXT_LOG_ID: AtomicU64 = AtomicU64::new(1);
static LOG_BUFFER: OnceLock<Mutex<Vec<LaunchLogEntry>>> = OnceLock::new();

fn buffer() -> &'static Mutex<Vec<LaunchLogEntry>> {
    LOG_BUFFER.get_or_init(|| Mutex::new(Vec::new()))
}

pub fn record_launch_start(
    game_id: &str,
    game_title: &str,
    command_repr: &str,
    runner_used: Option<String>,
    extreme_boost_active: bool,
    initial_notes: &str,
) -> u64 {
    let id = NEXT_LOG_ID.fetch_add(1, Ordering::Relaxed);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let entry = LaunchLogEntry {
        id,
        game_id: game_id.to_string(),
        game_title: game_title.to_string(),
        timestamp_epoch: now,
        command_repr: command_repr.to_string(),
        runner_used,
        extreme_boost_active,
        exit_code: None,
        output_tail: initial_notes.to_string(),
    };

    if let Ok(mut guard) = buffer().lock() {
        guard.insert(0, entry);
        if guard.len() > MAX_LOG_SESSIONS {
            guard.truncate(MAX_LOG_SESSIONS);
        }
    }
    id
}

pub fn finalize_launch_log(log_id: u64, exit_code: Option<i32>, extra_output: &str) {
    if let Ok(mut guard) = buffer().lock() {
        if let Some(entry) = guard.iter_mut().find(|e| e.id == log_id) {
            entry.exit_code = exit_code;
            if !extra_output.trim().is_empty() {
                if !entry.output_tail.is_empty() {
                    entry.output_tail.push('\n');
                }
                entry.output_tail.push_str(extra_output.trim());
                if entry.output_tail.len() > 16_384 {
                    let keep_from = entry.output_tail.len() - 16_384;
                    entry.output_tail = entry
                        .output_tail
                        .chars()
                        .skip(keep_from)
                        .collect::<String>();
                }
            }
        }
    }
}

pub fn list_launch_logs(game_id: Option<&str>) -> Vec<LaunchLogEntry> {
    let Ok(guard) = buffer().lock() else {
        return Vec::new();
    };
    match game_id {
        Some(gid) => guard
            .iter()
            .filter(|e| e.game_id == gid)
            .cloned()
            .collect(),
        None => guard.clone(),
    }
}

pub fn clear_all_launch_logs() {
    if let Ok(mut guard) = buffer().lock() {
        guard.clear();
    }
}

