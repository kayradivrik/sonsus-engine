//! HP Victus / Omen Donanım ve Güç Profili Yöneticisi (`hardware.rs`).
//! Linux `platform_profile`, `powerprofilesctl`, `intel_pstate` ve `hwmon`
//! fan/sıcaklık sensörlerini gerçek zamanlı okur ve güç profillerini kontrol eder.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareFanStatus {
    pub name: String,
    pub rpm: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareThermalStatus {
    pub cpu_temp_celsius: Option<f32>,
    pub battery_watts: Option<f32>,
    pub fans: Vec<HardwareFanStatus>,
    pub active_profile: String, // "performance" | "balanced" | "power-saver" | "cool"
    pub available_profiles: Vec<String>,
    pub is_hp_victus: bool,
}

pub fn read_hp_hardware_status() -> HardwareThermalStatus {
    let mut fans = Vec::new();

    // 1. Fan Hızlarını Oku (hp-isa veya hp-wmi hwmon)
    if let Ok(entries) = fs::read_dir("/sys/class/hwmon") {
        for entry in entries.flatten() {
            let p = entry.path();
            let name_file = p.join("name");
            if let Ok(name) = fs::read_to_string(&name_file) {
                let name = name.trim();
                if name.contains("hp") {
                    for i in 1..=4 {
                        let fan_input = p.join(format!("fan{i}_input"));
                        if let Ok(val) = fs::read_to_string(&fan_input) {
                            if let Ok(rpm) = val.trim().parse::<u32>() {
                                let label = if i == 1 { "CPU Fanı" } else { "GPU Fanı" };
                                fans.push(HardwareFanStatus {
                                    name: label.into(),
                                    rpm,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. CPU Sıcaklığı Oku (coretemp Package id 0 veya temp1_input)
    let mut cpu_temp: Option<f32> = None;
    if let Ok(entries) = fs::read_dir("/sys/class/hwmon") {
        for entry in entries.flatten() {
            let p = entry.path();
            let name_file = p.join("name");
            if let Ok(name) = fs::read_to_string(&name_file) {
                if name.trim().contains("coretemp") || name.trim().contains("k10temp") {
                    let temp_input = p.join("temp1_input");
                    if let Ok(val) = fs::read_to_string(&temp_input) {
                        if let Ok(millicelsius) = val.trim().parse::<f32>() {
                            cpu_temp = Some((millicelsius / 1000.0 * 10.0).round() / 10.0);
                        }
                    }
                }
            }
        }
    }

    // 3. Batarya Watt Güç Çekimi
    let mut battery_watts: Option<f32> = None;
    let power_file = Path::new("/sys/class/power_supply/BAT0/power_now");
    if let Ok(val) = fs::read_to_string(power_file) {
        if let Ok(microwatts) = val.trim().parse::<f32>() {
            battery_watts = Some((microwatts / 1_000_000.0 * 10.0).round() / 10.0);
        }
    }

    // 4. Aktif Güç Profili (powerprofilesctl veya platform_profile)
    let mut active = "balanced".to_string();
    let profile_file = Path::new("/sys/firmware/acpi/platform_profile");
    if let Ok(p) = fs::read_to_string(profile_file) {
        active = p.trim().to_string();
    } else {
        if let Ok(output) = Command::new("powerprofilesctl").arg("get").output() {
            if output.status.success() {
                active = String::from_utf8_lossy(&output.stdout).trim().to_string();
            }
        }
    }

    // 5. Desteklenen Profiller
    let mut available = vec!["performance".into(), "balanced".into(), "power-saver".into()];
    let choices_file = Path::new("/sys/firmware/acpi/platform_profile_choices");
    if let Ok(choices) = fs::read_to_string(choices_file) {
        available = choices.split_whitespace().map(String::from).collect();
    }

    let is_hp_victus = Path::new("/sys/devices/platform/hp-wmi").exists();

    HardwareThermalStatus {
        cpu_temp_celsius: cpu_temp,
        battery_watts,
        fans,
        active_profile: active,
        available_profiles: available,
        is_hp_victus,
    }
}

pub fn set_hardware_profile(profile: &str) -> Result<String, String> {
    // 1. powerprofilesctl aracılığıyla dene (Root şifresi istemez, masaüstüyle senkronizedir)
    let mapped_profile = match profile {
        "cool" | "quiet" => "power-saver",
        "performance" => "performance",
        _ => "balanced",
    };

    let pp_status = Command::new("powerprofilesctl")
        .args(["set", mapped_profile])
        .status();

    if let Ok(st) = pp_status {
        if st.success() {
            return Ok(format!("Güç profili '{profile}' moduna ayarlandı."));
        }
    }

    // 2. Doğrudan platform_profile sysfs'e yazmayı dene
    let target_file = "/sys/firmware/acpi/platform_profile";
    if Path::new(target_file).exists() {
        if let Ok(_) = fs::write(target_file, profile) {
            return Ok(format!("Donanım profili '{profile}' yapıldı."));
        }
    }

    Err("Güç profili değiştirilemedi. powerprofiles-daemon kurulu olduğundan emin olun.".into())
}
