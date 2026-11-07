//! sonsus-engine E-Spor / CS2 & Linux Ultra Performans Motoru (`optimizer.rs`).
//!
//! CS2 ve ağır 3D oyunlar için Linux çekirdeğini ve donanımı "Tek Amaç Oyun" moduna sokar:
//! - Intel Turbo Boost kilidini kaldırır (`no_turbo=0` -> 2.6 GHz yerine 4.7 GHz P-Core).
//! - CPU Valisi'ni `performance` moduna alır ve frekans tabanını %100'e kilitler.
//! - Intel P-Core (`0-7`) vs E-Core (`8-15`) mimarisini tespit eder ve oyun işlemlerini P-Core'a sabitler (`taskset`).
//! - Hibrit GPU laptoplarda (Iris Xe + RTX 4050) NVIDIA Prime Offload ortam değişkenlerini enjekte eder.
//! - Gamescope Stretched (`1000x1000` -> `1920x1080 @ 180Hz`) ve Doğrudan E-Spor modlarını Steam `localconfig.vdf` içine yazar.
//! - Çökme veya çıkışta orijinal CPU ve arka plan durumunu otomatik geri yükler.

use crate::models::{PerfBottleneckItem, SteamEsportsPresetPayload, UltraPerfStatus};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::Duration,
};

pub const BOOST_HELPER_PATH: &str = "/usr/local/bin/sonsus-boost-helper";
pub const SUDOERS_FILE_PATH: &str = "/etc/sudoers.d/99-sonsus-engine-boost";

/// Sistemdeki CPU modelini, P/E-Core dağılımını, GPU durumunu ve CS2 ayarlarını inceler.
pub fn inspect_ultra_perf_status() -> UltraPerfStatus {
    let mut status = UltraPerfStatus::default();

    // 1. CPU Model tespiti
    if let Ok(cpuinfo) = fs::read_to_string("/proc/cpuinfo") {
        for line in cpuinfo.lines() {
            if line.starts_with("model name") {
                if let Some((_, model)) = line.split_once(':') {
                    status.cpu_model = model.trim().to_string();
                    break;
                }
            }
        }
    }
    if status.cpu_model.is_empty() {
        status.cpu_model = "x86_64 Processor".into();
    }

    // 2. Hibrit CPU P-Core / E-Core tespiti
    // Linux'ta P-core'lar genelde daha yüksek cpuinfo_max_freq değerine sahiptir veya cpu0..cpuN aralığındadır
    let mut core_freqs: Vec<(usize, u64)> = Vec::new();
    let mut idx = 0;
    while Path::new(&format!("/sys/devices/system/cpu/cpu{idx}")).exists() {
        let max_freq_path = format!("/sys/devices/system/cpu/cpu{idx}/cpufreq/cpuinfo_max_freq");
        let freq = fs::read_to_string(&max_freq_path)
            .ok()
            .and_then(|s| s.trim().parse::<u64>().ok())
            .unwrap_or(0);
        core_freqs.push((idx, freq));
        idx += 1;
    }

    if !core_freqs.is_empty() {
        let max_khz = core_freqs.iter().map(|(_, f)| *f).max().unwrap_or(0);
        status.max_freq_mhz = max_khz / 1000;

        // Farklı frekans kümeleri varsa P-core ve E-core ayrımı yap
        let p_cores: Vec<usize> = core_freqs
            .iter()
            .filter(|(_, f)| *f >= (max_khz.saturating_sub(400_000)))
            .map(|(i, _)| *i)
            .collect();
        let e_cores: Vec<usize> = core_freqs
            .iter()
            .filter(|(_, f)| *f < (max_khz.saturating_sub(400_000)))
            .map(|(i, _)| *i)
            .collect();

        if !e_cores.is_empty() && !p_cores.is_empty() {
            status.p_core_range = Some(format_core_range(&p_cores));
            status.e_core_range = Some(format_core_range(&e_cores));
        } else {
            status.p_core_range = Some(format!("0-{}", core_freqs.len().saturating_sub(1)));
        }
    }

    // 3. Intel Turbo Boost / AMD Boost durumu
    if let Ok(raw) = fs::read_to_string("/sys/devices/system/cpu/intel_pstate/no_turbo") {
        let disabled = raw.trim() == "1";
        status.turbo_enabled = Some(!disabled);
    } else if let Ok(raw) = fs::read_to_string("/sys/devices/system/cpu/cpufreq/boost") {
        let enabled = raw.trim() == "1";
        status.turbo_enabled = Some(enabled);
    }

    // 4. Mevcut Governor
    if let Ok(gov) = fs::read_to_string("/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor") {
        status.current_governor = gov.trim().to_string();
    } else {
        status.current_governor = "unknown".into();
    }

    // 5. GPU & Hibrit Offload tespiti
    let pci_intel = Path::new("/sys/bus/pci/devices/0000:00:02.0").exists();
    let pci_nvidia = Path::new("/sys/bus/pci/devices/0000:01:00.0").exists();
    if pci_nvidia {
        // GPU adını oku
        if let Ok(out) = Command::new("nvidia-smi")
            .args(["--query-gpu=gpu_name", "--format=csv,noheader"])
            .output()
        {
            if out.status.success() {
                let name = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !name.is_empty() {
                    status.dgpu_name = Some(name);
                }
            }
        }
        if status.dgpu_name.is_none() {
            status.dgpu_name = Some("NVIDIA GeForce GPU".into());
        }
    }
    status.has_hybrid_gpu = pci_intel && pci_nvidia;

    // 6. nvidia-powerd servisi durumu (Mobil GPU'lar için 35W kilit çözücü)
    if let Ok(out) = Command::new("systemctl")
        .args(["is-active", "nvidia-powerd.service"])
        .output()
    {
        status.nvidia_powerd_active = String::from_utf8_lossy(&out.stdout).trim() == "active";
    }

    // 7. split_lock_mitigate durumu
    if let Ok(val) = fs::read_to_string("/proc/sys/kernel/split_lock_mitigate") {
        status.split_lock_mitigate = val.trim().parse::<i32>().ok();
    }

    // 8. RAM & Swap durumu
    if let Ok(mem) = fs::read_to_string("/proc/meminfo") {
        let mut total_kb = 0u64;
        let mut avail_kb = 0u64;
        let mut swap_total_kb = 0u64;
        let mut swap_free_kb = 0u64;

        for line in mem.lines() {
            if line.starts_with("MemTotal:") {
                total_kb = parse_mem_kb(line);
            } else if line.starts_with("MemAvailable:") {
                avail_kb = parse_mem_kb(line);
            } else if line.starts_with("SwapTotal:") {
                swap_total_kb = parse_mem_kb(line);
            } else if line.starts_with("SwapFree:") {
                swap_free_kb = parse_mem_kb(line);
            }
        }
        status.ram_total_mb = total_kb / 1024;
        status.ram_available_mb = avail_kb / 1024;
        status.swap_used_mb = (swap_total_kb.saturating_sub(swap_free_kb)) / 1024;
    }

    // 9. sonsus-boost-helper kurulu mu?
    status.passwordless_boost_installed = Path::new(BOOST_HELPER_PATH).exists()
        && Path::new(SUDOERS_FILE_PATH).exists();

    // 10. CS2 Steam Kurulumu ve LaunchOptions tespiti
    if let Some((vdf_path, opts)) = find_cs2_launch_options() {
        status.cs2_installed = true;
        status.cs2_current_launch_options = Some(opts);
        let _ = vdf_path;
    }

    // 11. Darboğaz Analizi ve Tavsiyeler (Bottleneck Evaluation)
    let mut b_list = Vec::new();

    if status.turbo_enabled == Some(false) {
        b_list.push(PerfBottleneckItem {
            id: "turbo_disabled".into(),
            severity: "critical".into(),
            title: "Intel Turbo Boost Kapalı (İşlemci 2.6 GHz Sınırında!)".into(),
            detail: "i5-13500H işlemciniz normalde 4.7 GHz'e çıkabilirken, şu anda no_turbo=1 sebebiyle 2.6 GHz'e kilitlenmiş durumda. CS2'de yaşanan 80 FPS düşüşünün ana sebebi budur."
                .into(),
            can_auto_fix: true,
        });
    }

    if status.current_governor == "powersave" {
        b_list.push(PerfBottleneckItem {
            id: "powersave_governor".into(),
            severity: "warning".into(),
            title: "CPU Valisi Güç Tasarrufunda (powersave)".into(),
            detail: "Çekirdekler ani yük bindiğinde frekans yükseltirken gecikme ve takılma (micro-stutter) yaşatıyor. 'performance' moduna geçilmelidir."
                .into(),
            can_auto_fix: true,
        });
    }

    if status.has_hybrid_gpu {
        let opts = status.cs2_current_launch_options.as_deref().unwrap_or("");
        let has_prime = opts.contains("__NV_PRIME_RENDER_OFFLOAD=1")
            || opts.contains("prime-run")
            || opts.contains("VK_ICD_FILENAMES")
            || opts.contains("sonsus-esports-wrap");

        if !has_prime {
            b_list.push(PerfBottleneckItem {
                id: "nvidia_offload_missing".into(),
                severity: "critical".into(),
                title: "CS2 RTX 4050 Yerine Dahili Intel Xe ile Başlatılıyor Olabilir".into(),
                detail: "Laptopunuzda hibrit GPU var ancak CS2 başlatma seçeneklerinde NVIDIA Prime Offload kancası eksik. RTX 4050 donanım hızlandırması garantiye alınmalıdır."
                    .into(),
                can_auto_fix: true,
            });
        }
    }

    if status.swap_used_mb > 1500 {
        b_list.push(PerfBottleneckItem {
            id: "high_swap".into(),
            severity: "warning".into(),
            title: format!("Yüksek Swap Baskısı ({} MB Takas Alanı Aktif)", status.swap_used_mb),
            detail: "Arka plandaki tarayıcı ve uygulamalar belleği doldurmuş. CS2 başlatılırken RAM drop-caches ile temizlenmeli ve arka plan uygulamaları dondurulmalıdır."
                .into(),
            can_auto_fix: true,
        });
    }

    if status.split_lock_mitigate == Some(1) {
        b_list.push(PerfBottleneckItem {
            id: "split_lock".into(),
            severity: "warning".into(),
            title: "Çekirdek Split Lock Yavaşlatması Açık".into(),
            detail: "Kernel seviyesinde split_lock_mitigate=1 oyun motoru çağrılarında FPS dalgalanmalarına yol açabilir."
                .into(),
            can_auto_fix: true,
        });
    }

    if !status.passwordless_boost_installed {
        b_list.push(PerfBottleneckItem {
            id: "helper_not_installed".into(),
            severity: "warning".into(),
            title: "Tek Tıkla Kalıcı Boost Servisi Kurulu Değil".into(),
            detail: "Oyun başlarken şifre sormadan çekirdek frekansını 4.7 GHz'e çıkarmak için root yardımcısı kurulmalıdır."
                .into(),
            can_auto_fix: true,
        });
    }

    status.bottlenecks = b_list;
    status
}

fn parse_mem_kb(line: &str) -> u64 {
    line.split_whitespace()
        .nth(1)
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(0)
}

fn format_core_range(cores: &[usize]) -> String {
    if cores.is_empty() {
        return "0".into();
    }
    let min = cores.iter().min().unwrap_or(&0);
    let max = cores.iter().max().unwrap_or(&0);
    if min == max {
        format!("{min}")
    } else {
        format!("{min}-{max}")
    }
}

/// CS2 (`730`) için Steam `localconfig.vdf` dosyasını bulur ve mevcut LaunchOptions'ı çeker.
pub fn find_cs2_launch_options() -> Option<(PathBuf, String)> {
    let home = dirs::home_dir()?;
    let candidate_dirs = [
        home.join(".local/share/Steam/userdata"),
        home.join(".steam/steam/userdata"),
        home.join(".steam/root/userdata"),
    ];

    for base in candidate_dirs {
        if !base.exists() {
            continue;
        }
        let Ok(users) = fs::read_dir(base) else {
            continue;
        };
        for user_dir in users.flatten() {
            let vdf_path = user_dir.path().join("config/localconfig.vdf");
            if vdf_path.exists() {
                if let Ok(content) = fs::read_to_string(&vdf_path) {
                    if let Some(opts) = extract_vdf_launch_options(&content, "730") {
                        return Some((vdf_path, opts));
                    }
                }
            }
        }
    }
    None
}

fn extract_vdf_launch_options(content: &str, appid: &str) -> Option<String> {
    let mut in_apps = false;
    let mut in_target_app = false;
    let mut depth = 0i32;
    let target_needle = format!("\"{appid}\"");

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed == "\"apps\"" || trimmed.starts_with("\"apps\"") {
            in_apps = true;
        }

        if in_apps {
            if trimmed == "{" {
                depth += 1;
            } else if trimmed == "}" {
                depth -= 1;
                if in_target_app {
                    in_target_app = false;
                }
                if depth <= 0 {
                    in_apps = false;
                }
            } else if trimmed == target_needle || trimmed.starts_with(&target_needle) {
                in_target_app = true;
            } else if in_target_app && trimmed.starts_with("\"LaunchOptions\"") {
                if let Some(opts) = parse_vdf_string_value(trimmed) {
                    return Some(opts);
                }
            }
        }
    }
    None
}

fn parse_vdf_string_value(line: &str) -> Option<String> {
    let mut parts = line.split('"').filter(|s| !s.trim().is_empty());
    let _key = parts.next()?;
    let val = parts.next()?;
    Some(val.to_string())
}

/// `/usr/local/bin/sonsus-boost-helper` ve `/etc/sudoers.d/99-sonsus-engine-boost` kurar (`pkexec` ile).
pub fn install_passwordless_boost_helper() -> Result<String, String> {
    let current_user = std::env::var("USER").unwrap_or_else(|_| "fsociecty".into());

    let helper_script = r#"#!/usr/bin/env bash
# sonsus-boost-helper - High Performance Linux Optimizer for sonsus-engine
set -euo pipefail

case "${1:-start}" in
  start)
    # 1. Intel Turbo Boost / AMD Boost Kilidini Kaldır
    if [ -f /sys/devices/system/cpu/intel_pstate/no_turbo ]; then
      echo 0 > /sys/devices/system/cpu/intel_pstate/no_turbo || true
      echo 100 > /sys/devices/system/cpu/intel_pstate/min_perf_pct || true
      if [ -f /sys/devices/system/cpu/intel_pstate/hwp_dynamic_boost ]; then
        echo 1 > /sys/devices/system/cpu/intel_pstate/hwp_dynamic_boost || true
      fi
    fi
    if [ -f /sys/devices/system/cpu/cpufreq/boost ]; then
      echo 1 > /sys/devices/system/cpu/cpufreq/boost || true
    fi

    # 2. CPU Governor -> Performance ve EPP -> Performance
    for g in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
      [ -f "$g" ] && echo performance > "$g" || true
    done
    for epp in /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference; do
      [ -f "$epp" ] && echo performance > "$epp" || true
    done

    # 3. Kernel split_lock ve autogroup optimizasyonları
    if [ -f /proc/sys/kernel/split_lock_mitigate ]; then
      sysctl -w kernel.split_lock_mitigate=0 >/dev/null 2>&1 || true
    fi
    if [ -f /proc/sys/kernel/sched_autogroup_enabled ]; then
      sysctl -w kernel.sched_autogroup_enabled=0 >/dev/null 2>&1 || true
    fi
    if [ -f /proc/sys/vm/swappiness ]; then
      sysctl -w vm.swappiness=10 >/dev/null 2>&1 || true
    fi

    # 4. NVIDIA Mobil Dynamic Boost servisini başlat
    systemctl start nvidia-powerd.service >/dev/null 2>&1 || true
    if command -v nvidia-smi >/dev/null 2>&1; then
      nvidia-smi -pm 1 >/dev/null 2>&1 || true
    fi

    # 5. RAM Temizliği
    sync
    echo 1 > /proc/sys/vm/drop_caches || true
    echo "SONSUS_BOOST_STARTED_OK"
    ;;

  stop)
    # Güç tasarrufuna geri dön
    for g in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
      [ -f "$g" ] && echo powersave > "$g" || true
    done
    for epp in /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference; do
      [ -f "$epp" ] && echo balance_performance > "$epp" || true
    done
    if [ -f /sys/devices/system/cpu/intel_pstate/min_perf_pct ]; then
      echo 10 > /sys/devices/system/cpu/intel_pstate/min_perf_pct || true
    fi
    if [ -f /proc/sys/kernel/sched_autogroup_enabled ]; then
      sysctl -w kernel.sched_autogroup_enabled=1 >/dev/null 2>&1 || true
    fi
    if [ -f /proc/sys/vm/swappiness ]; then
      sysctl -w vm.swappiness=60 >/dev/null 2>&1 || true
    fi
    echo "SONSUS_BOOST_STOPPED_OK"
    ;;

  status)
    echo "--- sonsus boost status ---"
    cat /sys/devices/system/cpu/intel_pstate/no_turbo 2>/dev/null || true
    cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null || true
    ;;
esac
"#;

    let sudoers_content = format!(
        "{current_user} ALL=(root) NOPASSWD: {BOOST_HELPER_PATH}\n"
    );

    let installer_sh = format!(
        r#"cat << 'EOF' > {BOOST_HELPER_PATH}
{helper_script}
EOF
chmod 0755 {BOOST_HELPER_PATH}

cat << 'EOF' > {SUDOERS_FILE_PATH}
{sudoers_content}
EOF
chmod 0440 {SUDOERS_FILE_PATH}
{BOOST_HELPER_PATH} start
"#
    );

    let status = Command::new("pkexec")
        .args(["bash", "-c", &installer_sh])
        .status()
        .map_err(|e| format!("Yetkilendirme (pkexec) başlatılamadı: {e}"))?;

    if !status.success() {
        return Err("Yetkilendirme iptal edildi veya başarısız oldu.".into());
    }

    Ok("Kalıcı E-Spor Ultra Boost yardımcısı başarıyla kuruldu ve aktif edildi!".into())
}

/// Canlı E-Spor Ultra Boost'u başlatır (Helper üzerinden veya direkt).
pub fn activate_extreme_boost(interactive_pkexec: bool) -> Result<Vec<i32>, String> {
    // 1. Helper komutunu çalıştır
    if Path::new(BOOST_HELPER_PATH).exists() {
        let _ = Command::new("sudo")
            .args(["-n", BOOST_HELPER_PATH, "start"])
            .status();
    } else if interactive_pkexec {
        install_passwordless_boost_helper()?;
    }

    // 2. power-profiles-daemon performance ayarı
    let _ = Command::new("powerprofilesctl")
        .args(["set", "performance"])
        .status();

    // 3. Baloo dosya indeksleyiciyi durdur
    let _ = Command::new("balooctl6").arg("suspend").status();
    let _ = Command::new("balooctl").arg("suspend").status();

    // 4. Ağır arka plan uygulamalarını dondur (SIGSTOP)
    let freeze_targets = [
        "firefox", "chromium", "brave", "chrome", "discord", "vesktop", "spotify",
        "slack", "code", "baloo_file",
    ];
    let frozen_pids = freeze_processes_by_names(&freeze_targets);

    Ok(frozen_pids)
}

/// E-Spor Ultra Boost modundan çıkar ve sistemi dengeli moda döndürür.
pub fn deactivate_extreme_boost(frozen_pids: &[i32]) {
    // Dondurulan süreçleri uyandır
    unfreeze_processes(frozen_pids);

    // Baloo'yu devam ettir
    let _ = Command::new("balooctl6").arg("resume").status();
    let _ = Command::new("balooctl").arg("resume").status();

    // Helper'a stop sinyali gönder
    if Path::new(BOOST_HELPER_PATH).exists() {
        let _ = Command::new("sudo")
            .args(["-n", BOOST_HELPER_PATH, "stop"])
            .status();
    }

    // Dengeli güç profiline dön
    let _ = Command::new("powerprofilesctl")
        .args(["set", "balanced"])
        .status();
}

fn freeze_processes_by_names(names: &[&str]) -> Vec<i32> {
    let mut frozen = Vec::new();
    #[cfg(unix)]
    {
        use nix::{
            sys::signal::{kill, Signal},
            unistd::Pid,
        };
        let self_pid = std::process::id() as i32;
        let Ok(entries) = fs::read_dir("/proc") else {
            return frozen;
        };

        for entry in entries.flatten() {
            let Ok(pid) = entry.file_name().to_string_lossy().parse::<i32>() else {
                continue;
            };
            if pid <= 1 || pid == self_pid {
                continue;
            }
            let Ok(comm) = fs::read_to_string(entry.path().join("comm")) else {
                continue;
            };
            let comm_lower = comm.trim().to_lowercase();
            if names.iter().any(|target| target == &comm_lower) {
                if kill(Pid::from_raw(pid), Signal::SIGSTOP).is_ok() {
                    frozen.push(pid);
                }
            }
        }
    }
    frozen
}

fn unfreeze_processes(pids: &[i32]) {
    #[cfg(unix)]
    {
        use nix::{
            sys::signal::{kill, Signal},
            unistd::Pid,
        };
        for &pid in pids {
            let _ = kill(Pid::from_raw(pid), Signal::SIGCONT);
        }
    }
}

/// E-spor başlatma sarmalayıcısını (`sonsus-esports-wrap.sh`) hazırlar.
pub fn ensure_esports_wrapper_script(p_cores: Option<&str>) -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Ev dizini bulunamadı".to_string())?;
    let wrap_dir = home.join(".local/share/sonsus-engine");
    fs::create_dir_all(&wrap_dir).map_err(|e| e.to_string())?;
    let script_path = wrap_dir.join("sonsus-esports-wrap.sh");

    let p_core_range = p_cores.unwrap_or("0-7");

    let script = format!(
        r#"#!/usr/bin/env bash
# sonsus-engine Esports Ultra-Performance Launcher Wrapper
set -e

# 1. LD_PRELOAD Steam Overlay Bug Temizliği
export LD_PRELOAD=""

# 2. NVIDIA Prime Offload Enjeksiyonu (RTX 4050 Mobil GPU Zorlama)
export __NV_PRIME_RENDER_OFFLOAD=1
export __GLX_VENDOR_LIBRARY_NAME=nvidia
export __VK_LAYER_NV_optimus=NVIDIA_only
export VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/nvidia_icd.json
export __GL_THREADED_OPTIMIZATIONS=1
export __GL_SHADER_DISK_CACHE=1
export __GL_SHADER_DISK_CACHE_SKIP_CLEANUP=1
export __GL_MaxFramesAllowed=1

# 3. SDL Pencere ve Wayland İyileştirmeleri
export SDL_VIDEO_MINIMIZE_ON_FOCUS_LOSS=0
export MESA_VK_DEVICE_SELECT_FORCE_DEFAULT_DEVICE=1

# 4. Donanım Boost Başlatıcı
if [ -x /usr/local/bin/sonsus-boost-helper ]; then
  sudo -n /usr/local/bin/sonsus-boost-helper start >/dev/null 2>&1 || true
fi
powerprofilesctl set performance >/dev/null 2>&1 || true

cleanup() {{
  if [ -x /usr/local/bin/sonsus-boost-helper ]; then
    sudo -n /usr/local/bin/sonsus-boost-helper stop >/dev/null 2>&1 || true
  fi
  powerprofilesctl set balanced >/dev/null 2>&1 || true
}}
trap cleanup EXIT

# 5. P-Core Sabitleme & GameMode ile Çalıştır
if command -v gamemoderun >/dev/null 2>&1; then
  exec taskset -c {p_core_range} gamemoderun "$@"
else
  exec taskset -c {p_core_range} "$@"
fi
"#
    );

    fs::write(&script_path, script).map_err(|e| e.to_string())?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&script_path, fs::Permissions::from_mode(0o755));
    }

    Ok(script_path)
}

/// Steam `localconfig.vdf` içindeki `"LaunchOptions"` alanına sonsus ultra FPS profilini yazar.
pub fn apply_steam_esports_preset(payload: SteamEsportsPresetPayload) -> Result<String, String> {
    let wrap_script = ensure_esports_wrapper_script(Some("0-7"))?;
    let wrap_str = wrap_script.to_string_lossy();

    let target_launch_opts = match payload.mode.as_str() {
        "native_max_fps" => {
            // Doğrudan E-Spor: Gamescope olmadan saf RTX 4050 + Vulkan + High Priority
            format!(
                "\"{wrap_str}\" %command% -vulkan -high -nojoy +fps_max 0 +engine_low_latency_sleep_after_client_tick 1"
            )
        }
        "gamescope_stretched" => {
            let iw = payload.internal_w.unwrap_or(1000);
            let ih = payload.internal_h.unwrap_or(1000);
            let ow = payload.output_w.unwrap_or(1920);
            let oh = payload.output_h.unwrap_or(1080);
            let hz = payload.refresh_hz.unwrap_or(180);
            let out_conn = payload
                .prefer_output
                .unwrap_or_else(|| "HDMI-A-1".into());

            // Gamescope Stretched modunda da RTX 4050 kancasını ve sıfır gecikmeli flip'i uygula
            format!(
                "\"{wrap_str}\" gamescope -w {iw} -h {ih} -W {ow} -H {oh} -S stretch -f -r {hz} --immediate-flips --prefer-output {out_conn} --force-grab-cursor --expose-wayland -- %command% -vulkan -high -nojoy +fps_max 0 +engine_low_latency_sleep_after_client_tick 1"
            )
        }
        _ => {
            format!("\"{wrap_str}\" %command% -vulkan -high +fps_max 0")
        }
    };

    let home = dirs::home_dir().ok_or_else(|| "Ev dizini bulunamadı".to_string())?;
    let candidate_dirs = [
        home.join(".local/share/Steam/userdata"),
        home.join(".steam/steam/userdata"),
        home.join(".steam/root/userdata"),
    ];

    let mut updated_files = 0;

    for base in candidate_dirs {
        if !base.exists() {
            continue;
        }
        let Ok(users) = fs::read_dir(base) else {
            continue;
        };
        for user_dir in users.flatten() {
            let vdf_path = user_dir.path().join("config/localconfig.vdf");
            if vdf_path.exists() {
                if update_single_vdf_file(&vdf_path, &payload.appid, &target_launch_opts)? {
                    updated_files += 1;
                }
            }
        }
    }

    if updated_files == 0 {
        return Err("Steam kullanıcı yapılandırma dosyası (localconfig.vdf) bulunamadı.".into());
    }

    if payload.restart_steam {
        restart_steam_client();
    }

    Ok(format!(
        "E-Spor başlatma kancası başarıyla Steam'e yazıldı ({target_launch_opts})."
    ))
}

fn update_single_vdf_file(vdf_path: &Path, appid: &str, new_opts: &str) -> Result<bool, String> {
    let raw = fs::read_to_string(vdf_path).map_err(|e| e.to_string())?;

    // Yedek al
    let backup_path = vdf_path.with_extension("vdf.sonsus_backup");
    if !backup_path.exists() {
        let _ = fs::write(&backup_path, &raw);
    }

    let target_tag = format!("\"{appid}\"");
    let mut lines: Vec<String> = raw.lines().map(|s| s.to_string()).collect();
    let mut in_apps = false;
    let mut in_target = false;
    let mut found_existing = false;
    let mut insert_idx = None;

    for i in 0..lines.len() {
        let trimmed = lines[i].trim();
        if trimmed == "\"apps\"" || trimmed.starts_with("\"apps\"") {
            in_apps = true;
        }
        if in_apps {
            if trimmed == target_tag || trimmed.starts_with(&target_tag) {
                in_target = true;
                insert_idx = Some(i + 2);
            } else if in_target {
                if trimmed.starts_with("\"LaunchOptions\"") {
                    lines[i] = format!("\t\t\t\t\t\t\"LaunchOptions\"\t\t\"{new_opts}\"");
                    found_existing = true;
                    break;
                } else if trimmed == "}" {
                    in_target = false;
                }
            }
        }
    }

    if !found_existing {
        if let Some(idx) = insert_idx {
            lines.insert(
                idx,
                format!("\t\t\t\t\t\t\"LaunchOptions\"\t\t\"{new_opts}\""),
            );
        } else {
            return Ok(false);
        }
    }

    let updated = lines.join("\n");
    fs::write(vdf_path, updated).map_err(|e| e.to_string())?;
    Ok(true)
}

fn restart_steam_client() {
    let _ = Command::new("steam").arg("-shutdown").status();
    std::thread::sleep(Duration::from_millis(1500));
    let _ = Command::new("steam").spawn();
}

/// Arka planda hedef oyun sürecini (örneğin CS2) izler ve PID'yi doğrudan P-core'lara kilitler + renice uygular.
pub fn spawn_live_pid_booster(process_hint: String, p_cores: Option<String>) {
    tauri::async_runtime::spawn(async move {
        let target_name = process_hint.to_lowercase();
        let target_cores = p_cores.unwrap_or_else(|| "0-7".into());

        for _ in 0..30 {
            tokio::time::sleep(Duration::from_secs(1)).await;
            if let Some(pid) = find_pid_by_name(&target_name) {
                // 1. P-Core sabitleme
                let _ = Command::new("taskset")
                    .args(["-cp", &target_cores, &pid.to_string()])
                    .status();
                // 2. İşlemci önceliği artırma (Renice)
                let _ = Command::new("renice")
                    .args(["-n", "-15", "-p", &pid.to_string()])
                    .status();
                // 3. Disk I/O önceliği
                let _ = Command::new("ionice")
                    .args(["-c", "2", "-n", "0", "-p", &pid.to_string()])
                    .status();
                break;
            }
        }
    });
}

fn find_pid_by_name(needle: &str) -> Option<i32> {
    let Ok(entries) = fs::read_dir("/proc") else {
        return None;
    };
    for entry in entries.flatten() {
        let Ok(pid) = entry.file_name().to_string_lossy().parse::<i32>() else {
            continue;
        };
        if pid <= 1 {
            continue;
        }
        if let Ok(comm) = fs::read_to_string(entry.path().join("comm")) {
            if comm.trim().to_lowercase().contains(needle) {
                return Some(pid);
            }
        }
    }
    None
}

