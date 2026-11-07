//! Oyun çalıştırma motoru, Proton/GE-Proton/Wine seçici, MangoHud, FSR, ekran çözünürlüğü ve süreç hook'ları.

use crate::{
    db::app_data_dir,
    models::{
        DisplayBackend, DisplayOutputInfo, HookProfile, Platform, RunnerInfo, UnifiedGame,
    },
    parsers::{epic::find_heroic_roots, steam::find_steam_root_with_override},
    platform_os::{has_binary, open_uri_scheme, run_shell_command},
};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::{Duration, Instant},
};
use tokio::time::sleep;

#[cfg(unix)]
use nix::{
    sys::signal::{kill, Signal},
    unistd::Pid,
};

#[cfg(unix)]
const PROTECTED_PROCESSES: &[&str] = &[
    "systemd",
    "init",
    "xorg",
    "xwayland",
    "kwin_wayland",
    "kwin_x11",
    "plasmashell",
    "hyprland",
    "sway",
    "mutter",
    "gnome-shell",
    "pipewire",
    "pipewire-pulse",
    "wireplumber",
    "dbus-daemon",
    "steam",
    "heroic",
    "lutris",
    "sonsus-engine",
    "krnl-launcher",
];

#[derive(Debug, Clone)]
pub enum SavedDisplayState {
    Xrandr {
        output: String,
        mode: String,
        rate: String,
    },
    Kscreen {
        output: String,
        mode_spec: String,
    },
}

pub struct SessionGuard {
    pub original_display: Option<SavedDisplayState>,
    pub suspended_pids: Vec<i32>,
    pub post_exit_cmd: Option<String>,
}

impl Drop for SessionGuard {
    fn drop(&mut self) {
        #[cfg(unix)]
        for &pid in &self.suspended_pids {
            let _ = kill(Pid::from_raw(pid), Signal::SIGCONT);
        }

        if let Some(orig) = &self.original_display {
            match orig {
                SavedDisplayState::Xrandr { output, mode, rate } => {
                    let mut cmd = Command::new("xrandr");
                    cmd.args(["--output", output, "--mode", mode]);
                    if !rate.is_empty() {
                        cmd.args(["--rate", rate]);
                    }
                    let _ = cmd.status();
                }
                SavedDisplayState::Kscreen { output, mode_spec } => {
                    let arg = format!("output.{output}.mode.{mode_spec}");
                    let _ = Command::new("kscreen-doctor").arg(arg).status();
                }
            }
        }

        if let Some(cmd) = &self.post_exit_cmd {
            run_shell_command(cmd);
        }
    }
}

/// Sistemdeki kurulu Proton, GE-Proton ve Wine uyumluluk katmanlarını otomatik tarar.
pub fn enumerate_runners(custom_steam_root: Option<&str>) -> Vec<RunnerInfo> {
    let mut runners: Vec<RunnerInfo> = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();

    let mut push_runner = |name: String, pb: PathBuf, kind: &str| {
        let s = pb.to_string_lossy().into_owned();
        if seen_paths.insert(s.clone()) {
            runners.push(RunnerInfo {
                name,
                path: s,
                kind: kind.to_string(),
            });
        }
    };

    #[cfg(unix)]
    {
        let mut compat_dirs: Vec<PathBuf> = Vec::new();
        if let Some(home) = dirs::home_dir() {
            compat_dirs.push(home.join(".steam/root/compatibilitytools.d"));
            compat_dirs.push(home.join(".steam/steam/compatibilitytools.d"));
            compat_dirs.push(home.join(".local/share/Steam/compatibilitytools.d"));
        }
        if let Some(sr) = find_steam_root_with_override(custom_steam_root) {
            compat_dirs.push(sr.join("compatibilitytools.d"));
            let common = sr.join("steamapps/common");
            if let Ok(entries) = fs::read_dir(common) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let fname = entry.file_name().to_string_lossy().into_owned();
                    if fname.starts_with("Proton") && path.join("proton").exists() {
                        push_runner(fname, path.join("proton"), "proton");
                    }
                }
            }
        }

        for dir in compat_dirs {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let proton_bin = path.join("proton");
                    if proton_bin.exists() {
                        let fname = entry.file_name().to_string_lossy().into_owned();
                        push_runner(fname, proton_bin, "proton");
                    }
                }
            }
        }

        for hr in find_heroic_roots() {
            let proton_tools = hr.join("tools/proton");
            if let Ok(entries) = fs::read_dir(proton_tools) {
                for entry in entries.flatten() {
                    let proton_bin = entry.path().join("proton");
                    if proton_bin.exists() {
                        let fname = entry.file_name().to_string_lossy().into_owned();
                        push_runner(format!("{fname} (Heroic)"), proton_bin, "proton");
                    }
                }
            }
            let wine_tools = hr.join("tools/wine");
            if let Ok(entries) = fs::read_dir(wine_tools) {
                for entry in entries.flatten() {
                    let wine_bin = entry.path().join("bin/wine");
                    if wine_bin.exists() {
                        let fname = entry.file_name().to_string_lossy().into_owned();
                        push_runner(format!("{fname} (Wine)"), wine_bin, "wine");
                    }
                }
            }
        }

        if has_binary("wine") {
            push_runner("Sistem Wine (Varsayılan)".into(), PathBuf::from("wine"), "wine");
        }
    }

    #[cfg(not(unix))]
    {
        let _ = (custom_steam_root, &mut push_runner);
    }

    runners.sort_by(|a, b| a.name.cmp(&b.name));
    runners
}

pub fn enumerate_displays() -> Vec<DisplayOutputInfo> {
    let mut outputs = Vec::new();
    #[cfg(not(unix))]
    {
        return outputs;
    }

    #[cfg(unix)]
    {
        let Ok(out) = Command::new("xrandr").arg("--current").output() else {
            return outputs;
        };
        let text = String::from_utf8_lossy(&out.stdout);

        let mut current: Option<DisplayOutputInfo> = None;
        for line in text.lines() {
            if line.contains(" connected") {
                if let Some(prev) = current.take() {
                    outputs.push(prev);
                }
                let name = line
                    .split_whitespace()
                    .next()
                    .unwrap_or("default")
                    .to_string();
                let primary = line.contains(" primary ");
                current = Some(DisplayOutputInfo::new(
                    name,
                    String::new(),
                    String::new(),
                    Vec::new(),
                    primary,
                ));
            } else if line.contains(" disconnected") {
                if let Some(prev) = current.take() {
                    outputs.push(prev);
                }
            } else if line.starts_with("   ") {
                if let Some(ref mut disp) = current {
                    let mut parts = line.split_whitespace();
                    if let Some(mode) = parts.next() {
                        if mode.contains('x')
                            && mode
                                .chars()
                                .next()
                                .map(|c| c.is_ascii_digit())
                                .unwrap_or(false)
                        {
                            if !disp.available_modes.iter().any(|m| m == mode) {
                                disp.available_modes.push(mode.to_string());
                            }
                            if let Some(active_rate) = parts.find(|p| p.contains('*')) {
                                disp.current_mode = mode.to_string();
                                disp.current_rate = active_rate
                                    .trim_matches(|c| c == '*' || c == '+')
                                    .to_string();
                            }
                        }
                    }
                }
            }
        }
        if let Some(last) = current {
            outputs.push(last);
        }
        outputs
    }
}

fn apply_display_hook(hook: &HookProfile) -> Option<SavedDisplayState> {
    let res = hook.target_resolution.as_deref()?.trim();
    if res.is_empty() {
        return None;
    }

    let session = std::env::var("XDG_SESSION_TYPE").unwrap_or_default();
    let displays = enumerate_displays();
    let chosen_disp = hook
        .target_output
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .and_then(|name| displays.iter().find(|d| d.name == name))
        .or_else(|| displays.iter().find(|d| d.is_primary()))
        .or_else(|| displays.first());

    let backend = match hook.display_backend {
        DisplayBackend::Auto => {
            if session == "wayland" && has_binary("kscreen-doctor") {
                DisplayBackend::Kscreen
            } else {
                DisplayBackend::Xrandr
            }
        }
        other => other,
    };

    match backend {
        DisplayBackend::Xrandr => {
            let disp = chosen_disp?;
            let saved = SavedDisplayState::Xrandr {
                output: disp.name.clone(),
                mode: disp.current_mode.clone(),
                rate: disp.current_rate.clone(),
            };
            let mut cmd = Command::new("xrandr");
            cmd.args(["--output", &disp.name, "--mode", res]);
            if let Some(hz) = hook.target_refresh_hz.as_deref().filter(|s| !s.trim().is_empty()) {
                cmd.args(["--rate", hz]);
            }
            let _ = cmd.status();
            Some(saved)
        }
        DisplayBackend::Kscreen => {
            let disp = chosen_disp?;
            let cur_hz = disp.current_rate.split('.').next().unwrap_or("60");
            let saved = SavedDisplayState::Kscreen {
                output: disp.name.clone(),
                mode_spec: format!("{}@{}", disp.current_mode, cur_hz),
            };
            let target_hz = hook
                .target_refresh_hz
                .as_deref()
                .filter(|s| !s.trim().is_empty())
                .and_then(|h| h.split('.').next())
                .unwrap_or(cur_hz);
            let spec = format!("output.{}.mode.{res}@{target_hz}", disp.name);
            let _ = Command::new("kscreen-doctor").arg(spec).status();
            Some(saved)
        }
        DisplayBackend::Gamescope | DisplayBackend::Auto => None,
    }
}

#[cfg(unix)]
fn suspend_processes_by_name(names: &[String]) -> Vec<i32> {
    let mut pids = Vec::new();
    let clean_names: Vec<String> = names
        .iter()
        .map(|n| n.trim().to_lowercase())
        .filter(|n| !n.is_empty() && !PROTECTED_PROCESSES.contains(&n.as_str()))
        .collect();

    if clean_names.is_empty() {
        return pids;
    }

    let self_pid = std::process::id() as i32;
    let Ok(proc_dir) = fs::read_dir("/proc") else {
        return pids;
    };

    for entry in proc_dir.flatten() {
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
        if PROTECTED_PROCESSES.contains(&comm_lower.as_str()) {
            continue;
        }
        if clean_names.iter().any(|target| target == &comm_lower) {
            if kill(Pid::from_raw(pid), Signal::SIGSTOP).is_ok() {
                pids.push(pid);
            }
        }
    }
    pids
}

#[cfg(not(unix))]
fn suspend_processes_by_name(_names: &[String]) -> Vec<i32> {
    Vec::new()
}

#[cfg(unix)]
fn is_steam_app_running(appid: &str) -> bool {
    let needle = format!("SteamAppId={appid}");
    let Ok(proc_dir) = fs::read_dir("/proc") else {
        return false;
    };
    for entry in proc_dir.flatten() {
        if !entry
            .file_name()
            .to_string_lossy()
            .chars()
            .all(|c| c.is_ascii_digit())
        {
            continue;
        }
        if let Ok(env_bytes) = fs::read(entry.path().join("environ")) {
            if env_bytes
                .split(|&b| b == 0)
                .any(|kv| kv == needle.as_bytes())
            {
                return true;
            }
        }
    }
    false
}

#[cfg(not(unix))]
fn is_steam_app_running(_appid: &str) -> bool {
    false
}

#[cfg(unix)]
fn is_process_in_install_dir(install_dir: &Path) -> bool {
    let dir_str = install_dir.to_string_lossy();
    if dir_str.is_empty() {
        return false;
    }
    let Ok(proc_dir) = fs::read_dir("/proc") else {
        return false;
    };
    for entry in proc_dir.flatten() {
        if !entry
            .file_name()
            .to_string_lossy()
            .chars()
            .all(|c| c.is_ascii_digit())
        {
            continue;
        }
        if let Ok(cwd) = fs::read_link(entry.path().join("cwd")) {
            if cwd.starts_with(install_dir) {
                return true;
            }
        }
        if let Ok(cmd) = fs::read(entry.path().join("cmdline")) {
            let text = String::from_utf8_lossy(&cmd);
            if text.contains(dir_str.as_ref()) {
                return true;
            }
        }
    }
    false
}

#[cfg(not(unix))]
fn is_process_in_install_dir(_install_dir: &Path) -> bool {
    false
}

pub async fn launch_with_hooks(game: UnifiedGame, hook: HookProfile) -> Result<u64, String> {
    let launch_cfg = game.launch.clone().ok_or_else(|| {
        "Bu oyun için çalıştırma yapılandırması bulunamadı (önce kurun).".to_string()
    })?;

    let started_at = Instant::now();
    let mut guard = SessionGuard {
        original_display: None,
        suspended_pids: Vec::new(),
        post_exit_cmd: if hook.enabled {
            hook.post_exit_cmd.clone()
        } else {
            None
        },
    };

    if hook.enabled {
        if let Some(ref pre_cmd) = hook.pre_launch_cmd {
            run_shell_command(pre_cmd);
        }
        guard.original_display = apply_display_hook(&hook);
        guard.suspended_pids = suspend_processes_by_name(&hook.suspend_processes);
    }

    let target = &launch_cfg.command_uri_or_bin;
    let is_uri = target.contains("://") || target.starts_with("lutris:");

    if is_uri {
        open_uri_scheme(target)?;

        if game.platform == Platform::Steam {
            for _ in 0..24 {
                sleep(Duration::from_secs(2)).await;
                if is_steam_app_running(&game.platform_id) {
                    break;
                }
            }
            while is_steam_app_running(&game.platform_id) {
                sleep(Duration::from_secs(2)).await;
            }
        } else if let Some(ref inst_dir) = game.install_path {
            for _ in 0..20 {
                sleep(Duration::from_secs(2)).await;
                if is_process_in_install_dir(inst_dir) {
                    break;
                }
            }
            while is_process_in_install_dir(inst_dir) {
                sleep(Duration::from_secs(2)).await;
            }
        } else {
            sleep(Duration::from_secs(5)).await;
        }
    } else {
        let mut program = target.clone();
        let mut full_args = launch_cfg.args.clone();
        let mut extra_envs: Vec<(String, String)> = Vec::new();

        // Özel Proton / GE-Proton / Wine uyumluluk katmanı seçimi (Linux)
        #[cfg(unix)]
        if let Some(runner) = hook
            .runner_path
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            let is_proton = runner.ends_with("/proton") || runner.to_lowercase().contains("proton");
            let is_legendary = program.ends_with("legendary");

            let compat_prefix = launch_cfg.wine_prefix.clone().unwrap_or_else(|| {
                app_data_dir()
                    .unwrap_or_else(|_| PathBuf::from("/tmp"))
                    .join("prefixes")
                    .join(game.id.replace(':', "_"))
            });
            let _ = fs::create_dir_all(&compat_prefix);

            if is_legendary {
                if is_proton {
                    full_args.push("--no-wine".into());
                    full_args.push("--wrapper".into());
                    full_args.push(format!("\"{runner}\" run"));
                    extra_envs.push((
                        "STEAM_COMPAT_DATA_PATH".into(),
                        compat_prefix.to_string_lossy().into_owned(),
                    ));
                    if let Some(sr) = find_steam_root_with_override(None) {
                        extra_envs.push((
                            "STEAM_COMPAT_CLIENT_INSTALL_PATH".into(),
                            sr.to_string_lossy().into_owned(),
                        ));
                    }
                } else {
                    full_args.push("--wine".into());
                    full_args.push(runner.to_string());
                }
            } else if program == "wine" || program.to_lowercase().ends_with(".exe") {
                let exe_target = if program == "wine" {
                    full_args.first().cloned().unwrap_or_default()
                } else {
                    program.clone()
                };
                let rest_args: Vec<String> = if program == "wine" && !full_args.is_empty() {
                    full_args[1..].to_vec()
                } else {
                    full_args.clone()
                };

                if is_proton {
                    program = runner.to_string();
                    let mut p_args = vec!["run".to_string(), exe_target];
                    p_args.extend(rest_args);
                    full_args = p_args;
                    extra_envs.push((
                        "STEAM_COMPAT_DATA_PATH".into(),
                        compat_prefix.to_string_lossy().into_owned(),
                    ));
                    if let Some(sr) = find_steam_root_with_override(None) {
                        extra_envs.push((
                            "STEAM_COMPAT_CLIENT_INSTALL_PATH".into(),
                            sr.to_string_lossy().into_owned(),
                        ));
                    }
                } else {
                    program = runner.to_string();
                    let mut w_args = vec![exe_target];
                    w_args.extend(rest_args);
                    full_args = w_args;
                }
            }
        }

        // MangoHud FPS/Sıcaklık katmanı
        if hook.enabled && hook.use_mangohud {
            extra_envs.push(("MANGOHUD".into(), "1".into()));
            if has_binary("mangohud") {
                full_args.insert(0, program);
                program = "mangohud".into();
            }
        }

        // Feral GameMode sarmalayıcısı
        if hook.enabled && hook.use_gamemode && has_binary("gamemoderun") {
            full_args.insert(0, program);
            program = "gamemoderun".into();
        }

        // Gamescope + FSR keskinleştirme sarmalayıcısı
        if hook.enabled
            && hook.display_backend == DisplayBackend::Gamescope
            && has_binary("gamescope")
        {
            if let Some(res) = hook.target_resolution.as_deref() {
                if let Some((w, h)) = res.split_once('x') {
                    let mut gs_args = vec![
                        "-W".into(),
                        w.trim().into(),
                        "-H".into(),
                        h.trim().into(),
                        "-f".into(),
                    ];
                    if hook.gamescope_fsr {
                        gs_args.push("-F".into());
                        gs_args.push("fsr".into());
                    }
                    if let Some(hz) = hook
                        .target_refresh_hz
                        .as_deref()
                        .filter(|s| !s.trim().is_empty())
                    {
                        gs_args.push("-r".into());
                        gs_args.push(hz.split('.').next().unwrap_or(hz).into());
                    }
                    gs_args.push("--".into());
                    gs_args.push(program);
                    gs_args.extend(full_args);
                    program = "gamescope".into();
                    full_args = gs_args;
                }
            }
        }

        let mut cmd = Command::new(&program);
        cmd.args(&full_args);
        if let Some(dir) = &launch_cfg.working_dir {
            if dir.exists() {
                cmd.current_dir(dir);
            }
        }
        if let Some(prefix) = &launch_cfg.wine_prefix {
            cmd.env("WINEPREFIX", prefix);
        }
        for (k, v) in extra_envs {
            cmd.env(k, v);
        }
        if hook.enabled {
            for item in &hook.custom_env {
                if let Some((k, v)) = item.split_once('=') {
                    let key = k.trim();
                    if !key.is_empty() {
                        cmd.env(key, v.trim());
                    }
                }
            }
        }

        let mut child = tokio::process::Command::from(cmd)
            .spawn()
            .map_err(|e| format!("Süreç başlatılamadı ({program}): {e}"))?;
        let _ = child.wait().await;
    }

    let elapsed_mins = started_at.elapsed().as_secs() / 60;
    drop(guard);
    Ok(elapsed_mins)
}
