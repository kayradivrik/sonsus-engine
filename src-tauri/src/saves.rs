//! Bulut Kayıt (Cloud Save) eşitleme ve yerel Save yedekleme / geri yükleme (`saves.rs`).

use crate::{
    db::app_data_dir,
    models::{Platform, SaveBackupInfo, UnifiedGame},
    parsers::epic::find_legendary_binary_path,
};
use std::{
    fs,
    path::PathBuf,
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

fn get_saves_backup_dir(game_id: &str) -> PathBuf {
    let clean_id = game_id.replace([':', '/', '\\'], "_");
    let base = app_data_dir()
        .unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".sonsus-engine"))
        .join("save_backups")
        .join(clean_id);
    let _ = fs::create_dir_all(&base);
    base
}

/// Epic/Legendary bulut kayıtlarını eşitler (`legendary sync-saves <app_name> -y`).
pub fn sync_cloud_saves(game: &UnifiedGame) -> Result<String, String> {
    if game.platform != Platform::Epic {
        return Err("Doğrudan bulut eşitleme şu anda Epic Games (Legendary) oyunları için desteklenmektedir.".into());
    }

    let bin = find_legendary_binary_path()
        .ok_or_else(|| "Bulut kayıt eşitlemesi için sistemde Legendary bulunamadı.".to_string())?;

    let out = Command::new(bin)
        .args(["sync-saves", &game.platform_id, "-y"])
        .output()
        .map_err(|e| format!("Eşitleme komutu çalıştırılamadı: {e}"))?;

    let stdout = String::from_utf8_lossy(&out.stdout);
    if !out.status.success() {
        return Err(format!("Bulut eşitleme hatası: {stdout}"));
    }

    Ok("Bulut kayıtları başarıyla eşitlendi.".into())
}

/// Oyunun save dizinini tespit edip sıkıştırılmış zip yedeğini oluşturur.
pub fn backup_game_saves(game: &UnifiedGame) -> Result<SaveBackupInfo, String> {
    let backup_dir = get_saves_backup_dir(&game.id);
    let epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let file_name = format!("save_backup_{epoch}.tar.gz");
    let full_path = backup_dir.join(&file_name);

    // Save kaynağı tespiti (Önce oyun klasöründeki saves / prefix / pfx)
    let source_dir = if let Some(ref p) = game.install_path {
        if p.join("saves").exists() {
            p.join("saves")
        } else if p.join("saved").exists() {
            p.join("saved")
        } else {
            p.clone()
        }
    } else {
        return Err("Oyun kurulum yolu bulunamadığı için kayıt dosyası tespit edilemedi.".into());
    };

    let out = Command::new("tar")
        .args([
            "-czf",
            full_path.to_string_lossy().as_ref(),
            "-C",
            source_dir.to_string_lossy().as_ref(),
            ".",
        ])
        .output()
        .map_err(|e| format!("Yedek alma başarısız oldu: {e}"))?;

    if !out.status.success() {
        return Err("Yedek arşivlenemedi.".into());
    }

    let size_bytes = fs::metadata(&full_path).map(|m| m.len()).unwrap_or(0);

    Ok(SaveBackupInfo {
        file_name,
        full_path: full_path.to_string_lossy().into_owned(),
        created_epoch: epoch,
        size_bytes,
    })
}

pub fn list_game_backups(game_id: &str) -> Vec<SaveBackupInfo> {
    let dir = get_saves_backup_dir(game_id);
    let mut list = Vec::new();

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(fname) = path.file_name().and_then(|s| s.to_str()) {
                if fname.starts_with("save_backup_") && fname.ends_with(".tar.gz") {
                    let epoch = fname
                        .strip_prefix("save_backup_")
                        .and_then(|s| s.strip_suffix(".tar.gz"))
                        .and_then(|s| s.parse::<i64>().ok())
                        .unwrap_or(0);

                    let size_bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);
                    list.push(SaveBackupInfo {
                        file_name: fname.to_string(),
                        full_path: path.to_string_lossy().into_owned(),
                        created_epoch: epoch,
                        size_bytes,
                    });
                }
            }
        }
    }

    list.sort_by(|a, b| b.created_epoch.cmp(&a.created_epoch));
    list
}

pub fn restore_game_backup(backup_path: &str, game: &UnifiedGame) -> Result<(), String> {
    let bp = PathBuf::from(backup_path);
    if !bp.exists() {
        return Err("Yedek dosyası bulunamadı.".into());
    }

    let target_dir = if let Some(ref p) = game.install_path {
        p.clone()
    } else {
        return Err("Hedef oyun dizini bulunamadı.".into());
    };

    let out = Command::new("tar")
        .args([
            "-xzf",
            bp.to_string_lossy().as_ref(),
            "-C",
            target_dir.to_string_lossy().as_ref(),
        ])
        .output()
        .map_err(|e| format!("Geri yükleme hatası: {e}"))?;

    if !out.status.success() {
        return Err("Yedek arşivden çıkarılamadı.".into());
    }

    Ok(())
}

