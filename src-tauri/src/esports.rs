//! Sonsus Engine - Windows 11 Esports Optimizasyon Motoru (`esports.rs`)
//!
//! 1. Windows Timer Resolution (0.5ms):
//!    `NtSetTimerResolution(5000, 1, &mut current)` çağrısı yaparak
//!    CS2, Valorant vb. rekabetçi oyunlarda giriş gecikmesini (input lag)
//!    1ms/15.6ms'den doğrudan 0.50ms'ye indirir.
//!
//! 2. Standby & Working Set RAM Flush:
//!    Windows üzerindeki süreçlerin boştaki çalışma belleklerini (`EmptyWorkingSet`)
//!    temizleyerek oyuna başlamadan önce gigabaytlarca RAM açar.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct TimerResolutionStatus {
    pub min_ms: f32,
    pub max_ms: f32,
    pub current_ms: f32,
    pub is_esports_active: bool,
}

#[cfg(windows)]
pub fn query_timer_resolution() -> Result<TimerResolutionStatus, String> {
    type NtQueryTimerResolutionFn = unsafe extern "system" fn(*mut u32, *mut u32, *mut u32) -> i32;

    unsafe {
        use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress};
        let ntdll = GetModuleHandleA(b"ntdll.dll\0".as_ptr());
        if ntdll.is_null() {
            return Err("ntdll.dll yüklenemedi".into());
        }

        let query_proc = GetProcAddress(ntdll, b"NtQueryTimerResolution\0".as_ptr());
        if let Some(proc) = query_proc {
            let nt_query: NtQueryTimerResolutionFn = std::mem::transmute(proc);
            let mut min = 0u32;
            let mut max = 0u32;
            let mut cur = 0u32;
            nt_query(&mut min, &mut max, &mut cur);

            let min_ms = min as f32 / 10000.0;
            let max_ms = max as f32 / 10000.0;
            let cur_ms = cur as f32 / 10000.0;

            Ok(TimerResolutionStatus {
                min_ms,
                max_ms,
                current_ms: cur_ms,
                is_esports_active: cur_ms <= 0.55,
            })
        } else {
            Err("NtQueryTimerResolution bulunamadı".into())
        }
    }
}

#[cfg(not(windows))]
pub fn query_timer_resolution() -> Result<TimerResolutionStatus, String> {
    Ok(TimerResolutionStatus {
        min_ms: 1.0,
        max_ms: 0.5,
        current_ms: 1.0,
        is_esports_active: false,
    })
}

#[cfg(windows)]
pub fn set_timer_resolution(enable: bool) -> Result<TimerResolutionStatus, String> {
    type NtSetTimerResolutionFn = unsafe extern "system" fn(u32, u8, *mut u32) -> i32;

    unsafe {
        use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress};
        let ntdll = GetModuleHandleA(b"ntdll.dll\0".as_ptr());
        if ntdll.is_null() {
            return Err("ntdll.dll yüklenemedi".into());
        }

        let set_proc = GetProcAddress(ntdll, b"NtSetTimerResolution\0".as_ptr());
        if let Some(proc) = set_proc {
            let nt_set: NtSetTimerResolutionFn = std::mem::transmute(proc);
            let mut current = 0u32;
            // 5000 * 100ns = 500,000ns = 0.5ms (Esports ultra düşük gecikme)
            let desired = if enable { 5000 } else { 10000 };
            let status = nt_set(desired, if enable { 1 } else { 0 }, &mut current);
            if status == 0 {
                query_timer_resolution()
            } else {
                Err(format!("NtSetTimerResolution başarısız (NTSTATUS: 0x{:X})", status))
            }
        } else {
            Err("NtSetTimerResolution bulunamadı".into())
        }
    }
}

#[cfg(not(windows))]
pub fn set_timer_resolution(_enable: bool) -> Result<TimerResolutionStatus, String> {
    query_timer_resolution()
}

#[cfg(windows)]
pub fn flush_working_set_ram() -> Result<u32, String> {
    type EmptyWorkingSetFn = unsafe extern "system" fn(isize) -> i32;
    type OpenProcessFn = unsafe extern "system" fn(u32, i32, u32) -> isize;
    type CloseHandleFn = unsafe extern "system" fn(isize) -> i32;
    type EnumProcessesFn = unsafe extern "system" fn(*mut u32, u32, *mut u32) -> i32;

    unsafe {
        use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress, LoadLibraryA};
        let kernel32 = GetModuleHandleA(b"kernel32.dll\0".as_ptr());
        let psapi = LoadLibraryA(b"psapi.dll\0".as_ptr());

        let empty_ws_proc = if !kernel32.is_null() {
            GetProcAddress(kernel32, b"K32EmptyWorkingSet\0".as_ptr())
                .or_else(|| if !psapi.is_null() { GetProcAddress(psapi, b"EmptyWorkingSet\0".as_ptr()) } else { None })
        } else {
            GetProcAddress(psapi, b"EmptyWorkingSet\0".as_ptr())
        };

        let enum_proc = if !kernel32.is_null() {
            GetProcAddress(kernel32, b"K32EnumProcesses\0".as_ptr())
                .or_else(|| if !psapi.is_null() { GetProcAddress(psapi, b"EnumProcesses\0".as_ptr()) } else { None })
        } else {
            GetProcAddress(psapi, b"EnumProcesses\0".as_ptr())
        };

        let open_proc = GetProcAddress(kernel32, b"OpenProcess\0".as_ptr());
        let close_proc = GetProcAddress(kernel32, b"CloseHandle\0".as_ptr());

        if let (Some(ews), Some(ep), Some(op), Some(cp)) = (empty_ws_proc, enum_proc, open_proc, close_proc) {
            let empty_ws: EmptyWorkingSetFn = std::mem::transmute(ews);
            let enum_processes: EnumProcessesFn = std::mem::transmute(ep);
            let open_process: OpenProcessFn = std::mem::transmute(op);
            let close_handle: CloseHandleFn = std::mem::transmute(cp);

            let mut pids = [0u32; 1024];
            let mut bytes_needed = 0u32;
            let ok = enum_processes(pids.as_mut_ptr(), (pids.len() * 4) as u32, &mut bytes_needed);
            let mut trimmed = 0u32;

            if ok != 0 {
                let count = (bytes_needed as usize / 4).min(pids.len());
                for &pid in &pids[..count] {
                    if pid <= 4 { continue; }
                    // PROCESS_QUERY_INFORMATION (0x0400) | PROCESS_SET_QUOTA (0x0100)
                    let handle = open_process(0x0500, 0, pid);
                    if handle != 0 {
                        if empty_ws(handle) != 0 {
                            trimmed += 1;
                        }
                        close_handle(handle);
                    }
                }
            }
            Ok(trimmed)
        } else {
            Err("Bellek temizleme fonksiyonları yüklenemedi".into())
        }
    }
}

#[cfg(not(windows))]
pub fn flush_working_set_ram() -> Result<u32, String> {
    Ok(0)
}
