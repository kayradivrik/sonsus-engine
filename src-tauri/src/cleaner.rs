//! Disk Alanı Analizcisi ve Shader / Önemsiz Dosya Temizleyici (`cleaner.rs`).
//! Steam shadercache, eski compatdata kalıntıları, Mesa/Nvidia shader önbellekleri
//! ve Heroic geçici indirme dosyalarını analiz eder ve tek tıkla temizler.

use crate::parsers::steam::find_steam_root;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanableCategory {
    pub id: String,
    pub title: String,
    pub description: String,
    pub path: String,
    pub size_bytes: u64,
    pub item_count: usize,
    pub safe_to_delete: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageAnalysisResult {
    pub total_reclaimable_bytes: u64,
    pub categories: Vec<CleanableCategory>,
}

fn dir_size_and_count(path: &Path) -> (u64, usize) {
    if !path.exists() {
        return (0, 0);
    }
    let mut total_size = 0u64;
    let mut count = 0usize;

    let mut stack = vec![path.to_path_buf()];
    while let Some(current) = stack.pop() {
        if let Ok(entries) = fs::read_dir(&current) {
            for entry in entries.flatten() {
                if let Ok(ft) = entry.file_type() {
                    if ft.is_dir() {
                        stack.push(entry.path());
                    } else if ft.is_file() {
                        count += 1;
                        if let Ok(meta) = entry.metadata() {
                            total_size += meta.len();
                        }
                    }
                }
            }
        }
    }
    (total_size, count)
}

pub fn analyze_storage() -> StorageAnalysisResult {
    let mut categories = Vec::new();
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/home"));

    
    // Windows DirectX & GPU Shader Cache (%LOCALAPPDATA%\D3DSCache)
    if cfg!(windows) {
        if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
            let d3d_cache = PathBuf::from(&local_appdata).join("D3DSCache");
            if d3d_cache.exists() {
                let (size, count) = dir_size_and_count(&d3d_cache);
                if size > 0 {
                    categories.push(CleanableCategory {
                        id: "d3d_shader_cache".into(),
                        title: "DirectX Shader Önbelleği (D3DSCache)".into(),
                        description: "Windows ve DirectX oyunlarının derlenmiş grafik shader önbellekleri.".into(),
                        path: d3d_cache.to_string_lossy().into(),
                        size_bytes: size,
                        item_count: count,
                        safe_to_delete: true,
                    });
                }
            }

            let nvidia_dx = PathBuf::from(&local_appdata).join("NVIDIA").join("DXCache");
            if nvidia_dx.exists() {
                let (size, count) = dir_size_and_count(&nvidia_dx);
                if size > 0 {
                    categories.push(CleanableCategory {
                        id: "nvidia_dx_cache".into(),
                        title: "Nvidia DirectX / Vulkan Önbelleği".into(),
                        description: "Nvidia sürücüsünün oluşturduğu DirectX grafik önbellekleri.".into(),
                        path: nvidia_dx.to_string_lossy().into(),
                        size_bytes: size,
                        item_count: count,
                        safe_to_delete: true,
                    });
                }
            }

            let amd_dx = PathBuf::from(&local_appdata).join("AMD").join("DxCache");
            if amd_dx.exists() {
                let (size, count) = dir_size_and_count(&amd_dx);
                if size > 0 {
                    categories.push(CleanableCategory {
                        id: "amd_dx_cache".into(),
                        title: "AMD Radeon DirectX Önbelleği".into(),
                        description: "AMD sürücüsünün oluşturduğu DirectX grafik önbellekleri.".into(),
                        path: amd_dx.to_string_lossy().into(),
                        size_bytes: size,
                        item_count: count,
                        safe_to_delete: true,
                    });
                }
            }

            let crash_dumps = PathBuf::from(&local_appdata).join("CrashDumps");
            if crash_dumps.exists() {
                let (size, count) = dir_size_and_count(&crash_dumps);
                if size > 0 {
                    categories.push(CleanableCategory {
                        id: "windows_crash_dumps".into(),
                        title: "Windows Oyun Çökme Dökümleri (CrashDumps)".into(),
                        description: "Oyunların çöktüğünde diske bıraktığı büyük bellek döküm (.dmp) dosyaları.".into(),
                        path: crash_dumps.to_string_lossy().into(),
                        size_bytes: size,
                        item_count: count,
                        safe_to_delete: true,
                    });
                }
            }
        }

        // Windows Temp Klasörü
        let temp_dir = std::env::temp_dir();
        if temp_dir.exists() {
            let (size, count) = dir_size_and_count(&temp_dir);
            if size > 0 {
                categories.push(CleanableCategory {
                    id: "windows_temp".into(),
                    title: "Windows Geçici Dosyaları (AppData Temp)".into(),
                    description: "Oyun yükleyicileri ve arka plan servislerinin geride bıraktığı geçici dosyalar.".into(),
                    path: temp_dir.to_string_lossy().into(),
                    size_bytes: size,
                    item_count: count,
                    safe_to_delete: true,
                });
            }
        }

        // Windows Steam Shader Önbelleği
        if let Some(steam_root) = find_steam_root() {
            let steam_shader = steam_root.join("steamapps/shadercache");
            if steam_shader.exists() {
                let (size, count) = dir_size_and_count(&steam_shader);
                if size > 0 {
                    categories.push(CleanableCategory {
                        id: "steam_shadercache".into(),
                        title: "Steam Shader Önbelleği (Windows)".into(),
                        description: "Steam oyunları için derlenmiş DirectX/Vulkan shader önbellekleri.".into(),
                        path: steam_shader.to_string_lossy().into(),
                        size_bytes: size,
                        item_count: count,
                        safe_to_delete: true,
                    });
                }
            }
        }
    }

    // 1. Steam Shader Önbelleği (Linux ~/.local/share/Steam/steamapps/shadercache)
    #[cfg(not(windows))]
    {
        let steam_shader = home.join(".local/share/Steam/steamapps/shadercache");
        if steam_shader.exists() {
            let (size, count) = dir_size_and_count(&steam_shader);
            if size > 0 {
                categories.push(CleanableCategory {
                    id: "steam_shadercache".into(),
                    title: "Steam Shader Önbelleği".into(),
                    description: "Oyunlar için derlenmiş GL/Vulkan shader dosyaları. Silindiğinde oyun açılışında otomatik tekrar derlenir.".into(),
                    path: steam_shader.to_string_lossy().into(),
                    size_bytes: size,
                    item_count: count,
                    safe_to_delete: true,
                });
            }
        }
    }

    // 2. Mesa Shader Önbelleği (~/.cache/mesa_shader_cache)
    let mesa_cache = home.join(".cache/mesa_shader_cache");
    if mesa_cache.exists() {
        let (size, count) = dir_size_and_count(&mesa_cache);
        if size > 0 {
            categories.push(CleanableCategory {
                id: "mesa_shader_cache".into(),
                title: "Mesa / AMD / Intel GPU Shader Önbelleği".into(),
                description: "Sistem seviyesinde derlenen Vulkan ve OpenGL grafik boru hattı önbelleği.".into(),
                path: mesa_cache.to_string_lossy().into(),
                size_bytes: size,
                item_count: count,
                safe_to_delete: true,
            });
        }
    }

    // 3. Nvidia Shader Önbelleği (~/.cache/nvidia/GLCache ve nv)
    let nvidia_cache = home.join(".cache/nvidia/GLCache");
    if nvidia_cache.exists() {
        let (size, count) = dir_size_and_count(&nvidia_cache);
        if size > 0 {
            categories.push(CleanableCategory {
                id: "nvidia_gl_cache".into(),
                title: "Nvidia GPU GL / DXVK Önbelleği".into(),
                description: "Nvidia tescilli sürücüsünün biriktirdiği derlenmiş grafik önbellekleri.".into(),
                path: nvidia_cache.to_string_lossy().into(),
                size_bytes: size,
                item_count: count,
                safe_to_delete: true,
            });
        }
    }

    // 4. Heroic Games Launcher Geçici Önbellekleri
    let heroic_cache = home.join(".cache/heroic");
    if heroic_cache.exists() {
        let (size, count) = dir_size_and_count(&heroic_cache);
        if size > 0 {
            categories.push(CleanableCategory {
                id: "heroic_cache".into(),
                title: "Heroic & Legendary Geçici Dosyaları".into(),
                description: "İndirme parçacıkları, küçük resim ve mağaza oturum önbellekleri.".into(),
                path: heroic_cache.to_string_lossy().into(),
                size_bytes: size,
                item_count: count,
                safe_to_delete: true,
            });
        }
    }

    // 5. Yetim / Silinmiş Steam Compatdata (Wine Prefix) Tespiti
    let steamapps = home.join(".local/share/Steam/steamapps");
    let compatdata = steamapps.join("compatdata");
    if compatdata.exists() {
        let mut orphaned_size = 0u64;
        let mut orphaned_count = 0usize;
        let mut orphan_paths = Vec::new();

        if let Ok(entries) = fs::read_dir(&compatdata) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().into_owned();
                // appmanifest_{appid}.acf yoksa oyun silinmiş demektir ama Wine prefix'i kalmıştır
                let manifest = steamapps.join(format!("appmanifest_{name}.acf"));
                if !manifest.exists() && name.chars().all(|c| c.is_ascii_digit()) {
                    let (s, c) = dir_size_and_count(&entry.path());
                    orphaned_size += s;
                    orphaned_count += c;
                    orphan_paths.push(entry.path());
                }
            }
        }

        if orphaned_size > 0 {
            categories.push(CleanableCategory {
                id: "orphaned_compatdata".into(),
                title: "Silinmiş Oyunların Artık Wine Prefix'leri (compatdata)".into(),
                description: format!("Steam'den silinmiş fakat diskte yer kaplamaya devam eden {} adet yetim Proton sanal Windows ortamı.", orphan_paths.len()),
                path: compatdata.to_string_lossy().into(),
                size_bytes: orphaned_size,
                item_count: orphaned_count,
                safe_to_delete: true,
            });
        }
    }

    let total = categories.iter().map(|c| c.size_bytes).sum();
    StorageAnalysisResult {
        total_reclaimable_bytes: total,
        categories,
    }
}

pub fn clean_storage_category(category_id: &str) -> Result<u64, String> {
    let home = dirs::home_dir().ok_or_else(|| "Ev dizini bulunamadı".to_string())?;

    match category_id {
        
        "d3d_shader_cache" => {
            let mut sz = 0;
            if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
                let p = PathBuf::from(local_appdata).join("D3DSCache");
                if p.exists() {
                    let (s, _) = dir_size_and_count(&p);
                    sz = s;
                    let _ = fs::remove_dir_all(&p);
                    let _ = fs::create_dir_all(&p);
                }
            }
            Ok(sz)
        }
        "nvidia_dx_cache" => {
            let mut sz = 0;
            if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
                let p = PathBuf::from(local_appdata).join("NVIDIA").join("DXCache");
                if p.exists() {
                    let (s, _) = dir_size_and_count(&p);
                    sz = s;
                    let _ = fs::remove_dir_all(&p);
                    let _ = fs::create_dir_all(&p);
                }
            }
            Ok(sz)
        }
        "amd_dx_cache" => {
            let mut sz = 0;
            if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
                let p = PathBuf::from(local_appdata).join("AMD").join("DxCache");
                if p.exists() {
                    let (s, _) = dir_size_and_count(&p);
                    sz = s;
                    let _ = fs::remove_dir_all(&p);
                    let _ = fs::create_dir_all(&p);
                }
            }
            Ok(sz)
        }
        "windows_crash_dumps" => {
            let mut sz = 0;
            if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
                let p = PathBuf::from(local_appdata).join("CrashDumps");
                if p.exists() {
                    let (s, _) = dir_size_and_count(&p);
                    sz = s;
                    let _ = fs::remove_dir_all(&p);
                    let _ = fs::create_dir_all(&p);
                }
            }
            Ok(sz)
        }
        "windows_temp" => {
            let temp_dir = std::env::temp_dir();
            let mut sz = 0;
            if temp_dir.exists() {
                if let Ok(entries) = fs::read_dir(&temp_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        let (s, _) = dir_size_and_count(&path);
                        if path.is_file() {
                            if fs::remove_file(&path).is_ok() {
                                sz += s;
                            }
                        } else if path.is_dir() {
                            if fs::remove_dir_all(&path).is_ok() {
                                sz += s;
                            }
                        }
                    }
                }
            }
            Ok(sz)
        }
        "steam_shadercache" => {
            #[cfg(windows)]
            {
                if let Some(steam_root) = find_steam_root() {
                    let p = steam_root.join("steamapps/shadercache");
                    let (sz, _) = dir_size_and_count(&p);
                    let _ = fs::remove_dir_all(&p);
                    let _ = fs::create_dir_all(&p);
                    return Ok(sz);
                }
                Ok(0)
            }
            #[cfg(not(windows))]
            {
                let p = home.join(".local/share/Steam/steamapps/shadercache");
                let (sz, _) = dir_size_and_count(&p);
                let _ = fs::remove_dir_all(&p);
                let _ = fs::create_dir_all(&p);
                Ok(sz)
            }
        }
        "mesa_shader_cache" => {
            let p = home.join(".cache/mesa_shader_cache");
            let (sz, _) = dir_size_and_count(&p);
            let _ = fs::remove_dir_all(&p);
            let _ = fs::create_dir_all(&p);
            Ok(sz)
        }
        "nvidia_gl_cache" => {
            let p = home.join(".cache/nvidia/GLCache");
            let (sz, _) = dir_size_and_count(&p);
            let _ = fs::remove_dir_all(&p);
            let _ = fs::create_dir_all(&p);
            Ok(sz)
        }
        "heroic_cache" => {
            let p = home.join(".cache/heroic");
            let (sz, _) = dir_size_and_count(&p);
            let _ = fs::remove_dir_all(&p);
            let _ = fs::create_dir_all(&p);
            Ok(sz)
        }
        "orphaned_compatdata" => {
            let steamapps = home.join(".local/share/Steam/steamapps");
            let compatdata = steamapps.join("compatdata");
            let mut freed = 0u64;

            if let Ok(entries) = fs::read_dir(&compatdata) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().into_owned();
                    let manifest = steamapps.join(format!("appmanifest_{name}.acf"));
                    if !manifest.exists() && name.chars().all(|c| c.is_ascii_digit()) {
                        let (s, _) = dir_size_and_count(&entry.path());
                        if fs::remove_dir_all(entry.path()).is_ok() {
                            freed += s;
                        }
                    }
                }
            }
            Ok(freed)
        }
        _ => Err("Bilinmeyen temizlik kategorisi".into()),
    }
}
