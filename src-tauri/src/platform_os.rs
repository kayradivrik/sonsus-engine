//! Linux ve Windows işletim sistemleri arasındaki dosya yöneticisi, URI şeması,
//! disk boş alan (`statvfs` / `GetDiskFreeSpaceExW`), masaüstü bildirimleri ve yerel klasör/dosya seçme köprüsü.

use std::{path::Path, process::Command};

#[cfg(windows)]
use std::path::PathBuf;

pub fn has_binary(name: &str) -> bool {
    #[cfg(unix)]
    {
        if Path::new(&format!("/usr/bin/{name}")).exists()
            || Path::new(&format!("/usr/local/bin/{name}")).exists()
        {
            return true;
        }
    }

    std::env::var_os("PATH")
        .map(|paths| {
            std::env::split_paths(&paths).any(|dir| {
                if dir.join(name).exists() {
                    return true;
                }
                #[cfg(windows)]
                {
                    if dir.join(format!("{name}.exe")).exists()
                        || dir.join(format!("{name}.cmd")).exists()
                    {
                        return true;
                    }
                }
                false
            })
        })
        .unwrap_or(false)
}

#[cfg(unix)]
pub fn query_disk_space(path: &Path) -> (u64, u64) {
    let mut probe = path.to_path_buf();
    while !probe.exists() {
        let Some(parent) = probe.parent() else {
            return (0, 0);
        };
        probe = parent.to_path_buf();
    }
    if let Ok(stat) = nix::sys::statvfs::statvfs(&probe) {
        let bsize = stat.fragment_size() as u64;
        let free = (stat.blocks_available() as u64).saturating_mul(bsize);
        let total = (stat.blocks() as u64).saturating_mul(bsize);
        return (free, total);
    }
    (0, 0)
}

#[cfg(windows)]
pub fn query_disk_space(path: &Path) -> (u64, u64) {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;

    let mut probe: PathBuf = path.to_path_buf();
    while !probe.exists() {
        let Some(parent) = probe.parent() else {
            return (0, 0);
        };
        probe = parent.to_path_buf();
    }

    let wide: Vec<u16> = probe
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let mut free_avail: u64 = 0;
    let mut total_bytes: u64 = 0;
    let ok = unsafe {
        GetDiskFreeSpaceExW(
            wide.as_ptr(),
            &mut free_avail as *mut u64,
            &mut total_bytes as *mut u64,
            std::ptr::null_mut(),
        )
    };
    if ok != 0 {
        (free_avail, total_bytes)
    } else {
        (0, 0)
    }
}

#[cfg(not(any(unix, windows)))]
pub fn query_disk_space(_path: &Path) -> (u64, u64) {
    (0, 0)
}

pub fn send_desktop_notification(title: &str, body: &str) {
    #[cfg(not(windows))]
    {
        if has_binary("notify-send") {
            let _ = Command::new("notify-send")
                .args(["-a", "sonsus-engine", title, body])
                .spawn();
        }
    }

    #[cfg(windows)]
    {
        let safe_t = title.replace('\'', "");
        let safe_b = body.replace('\'', "");
        let script = format!(
            "Add-Type -AssemblyName System.Windows.Forms; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.Visible = $true; $n.ShowBalloonTip(4000, '{safe_t}', '{safe_b}', [System.Windows.Forms.ToolTipIcon]::Info)"
        );
        let _ = Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
            .spawn();
    }
}

pub fn open_path_in_explorer(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err(format!("Klasör bulunamadı: {}", path.display()));
    }

    #[cfg(windows)]
    {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Windows Gezgini açılamadı: {e}"))?;
        return Ok(());
    }

    #[cfg(not(windows))]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Dosya yöneticisi açılamadı: {e}"))?;
        Ok(())
    }
}

pub fn open_uri_scheme(uri: &str) -> Result<(), String> {
    #[cfg(windows)]
    {
        Command::new("cmd")
            .args(["/C", "start", "", uri])
            .spawn()
            .map_err(|e| format!("URI başlatılamadı ({uri}): {e}"))?;
        return Ok(());
    }

    #[cfg(not(windows))]
    {
        Command::new("xdg-open")
            .arg(uri)
            .spawn()
            .map_err(|e| format!("URI başlatılamadı ({uri}): {e}"))?;
        Ok(())
    }
}

pub fn run_shell_command(cmd_line: &str) {
    if cmd_line.trim().is_empty() {
        return;
    }
    #[cfg(windows)]
    {
        let _ = Command::new("cmd").args(["/C", cmd_line]).status();
    }
    #[cfg(not(windows))]
    {
        let _ = Command::new("sh").args(["-c", cmd_line]).status();
    }
}

/// Linux (`kdialog` / `zenity`) ve Windows (PowerShell `FolderBrowserDialog`) üzerinde klasör seçme penceresi açar.
pub fn pick_directory_dialog(initial: Option<&str>) -> Option<String> {
    #[cfg(windows)]
    {
        let _ = initial;
        let script = r#"Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.ShowNewFolderButton = $true; if ($f.ShowDialog() -eq 'OK') { Write-Output $f.SelectedPath }"#;
        let out = Command::new("powershell")
            .args(["-NoProfile", "-Command", script])
            .output()
            .ok()?;
        let chosen = String::from_utf8_lossy(&out.stdout).trim().to_string();
        return if chosen.is_empty() { None } else { Some(chosen) };
    }

    #[cfg(not(windows))]
    {
        let start_dir = initial
            .filter(|s| !s.trim().is_empty())
            .map(ToOwned::to_owned)
            .or_else(|| dirs::home_dir().map(|p| p.to_string_lossy().into_owned()))
            .unwrap_or_else(|| "/".to_string());

        if has_binary("kdialog") {
            if let Ok(out) = Command::new("kdialog")
                .args(["--getexistingdirectory", &start_dir, "--title", "Klasör Seç"])
                .output()
            {
                if out.status.success() {
                    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if !s.is_empty() {
                        return Some(s);
                    }
                }
            }
        }

        if has_binary("zenity") {
            if let Ok(out) = Command::new("zenity")
                .args([
                    "--file-selection",
                    "--directory",
                    "--title=Klasör Seç",
                    &format!("--filename={start_dir}/"),
                ])
                .output()
            {
                if out.status.success() {
                    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if !s.is_empty() {
                        return Some(s);
                    }
                }
            }
        }

        None
    }
}

/// Özel oyun ekleme için çalıştırılabilir dosya (`.exe`, `.AppImage`, `.sh`, vb.) seçme penceresi açar.
pub fn pick_executable_dialog(initial: Option<&str>) -> Option<String> {
    #[cfg(windows)]
    {
        let _ = initial;
        let script = r#"Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'Oyun Dosyaları (*.exe;*.bat;*.cmd)|*.exe;*.bat;*.cmd|Tüm Dosyalar (*.*)|*.*'; if ($f.ShowDialog() -eq 'OK') { Write-Output $f.FileName }"#;
        let out = Command::new("powershell")
            .args(["-NoProfile", "-Command", script])
            .output()
            .ok()?;
        let chosen = String::from_utf8_lossy(&out.stdout).trim().to_string();
        return if chosen.is_empty() { None } else { Some(chosen) };
    }

    #[cfg(not(windows))]
    {
        let start_dir = initial
            .filter(|s| !s.trim().is_empty())
            .map(ToOwned::to_owned)
            .or_else(|| dirs::home_dir().map(|p| p.to_string_lossy().into_owned()))
            .unwrap_or_else(|| "/".to_string());

        if has_binary("kdialog") {
            if let Ok(out) = Command::new("kdialog")
                .args([
                    "--getopenfilename",
                    &start_dir,
                    "--title",
                    "Çalıştırılabilir Oyun Dosyası Seç",
                ])
                .output()
            {
                if out.status.success() {
                    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if !s.is_empty() {
                        return Some(s);
                    }
                }
            }
        }

        if has_binary("zenity") {
            if let Ok(out) = Command::new("zenity")
                .args([
                    "--file-selection",
                    "--title=Çalıştırılabilir Oyun Dosyası Seç",
                    &format!("--filename={start_dir}/"),
                ])
                .output()
            {
                if out.status.success() {
                    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if !s.is_empty() {
                        return Some(s);
                    }
                }
            }
        }

        None
    }
}

pub fn detect_session_label() -> String {
    #[cfg(windows)]
    {
        return "windows".to_string();
    }

    #[cfg(not(windows))]
    {
        std::env::var("XDG_SESSION_TYPE").unwrap_or_else(|_| "unknown".into())
    }
}
