#!/usr/bin/env python3
"""
Sonsus Engine - Universal Gaming Key & Hardware Daemon
Desteklenen Markalar ve Donanımlar:
- HP Omen / Victus: Omen Gaming Hub Key (KEY_PROG2 - 149)
- Asus ROG / TUF: ROG Key (KEY_PROG1 - 148 / KEY_PROG3 - 202)
- Lenovo Legion: Legion Fn+Q / Vantage Key (KEY_PROG1 - 148 / KEY_PROG2 - 149)
- Dell Alienware: Alienware Command Center Key
- Evrensel Oyun Tuşları (148, 149, 156, 202, 203)

Davranış:
- TEK BASIŞ (Single Tap): Sonsus Engine Başlatıcıyı aç (veya açıksa öne getir).
- ÇİFT BASIŞ (Double Tap): ACPI Termal / Fan Profilini Değiştir (Performans 🔥 <-> Sessiz 🍃).
"""
import struct
import subprocess
import os
import sys
import time
import threading
import glob

FORMAT = 'qqHHI'
EVENT_SIZE = struct.calcsize(FORMAT)

# Evrensel Gaming Tuş Kodları (Linux input-event-codes)
# 148: KEY_PROG1 (Asus ROG, Lenovo Vantage)
# 149: KEY_PROG2 (HP Omen / Victus Gaming Hub)
# 202: KEY_PROG3 (Asus TUF Gaming)
# 203: KEY_PROG4
# 156: KEY_BOOKMARKS / Game Center
GAMING_KEYS = {148, 149, 202, 203, 156}

def get_active_user_env():
    """
    Sistem açılışında veya oturum değiştiğinde aktif masaüstü kullanıcısını ve
    Wayland/X11 soketlerini dinamik tespit eder. Asla 'root'a kilitlenmez.
    """
    for uid_dir in sorted(glob.glob('/run/user/[0-9]*'), reverse=True):
        try:
            uid = int(os.path.basename(uid_dir))
            if uid >= 1000:
                import pwd
                pw = pwd.getpwuid(uid)
                username = pw.pw_name
                home = pw.pw_dir

                wayland_sock = None
                for sock in sorted(glob.glob(f'{uid_dir}/wayland-[0-9]*'), reverse=True):
                    if not sock.endswith('.lock') and os.path.exists(sock):
                        wayland_sock = os.path.basename(sock)
                        break

                env = {
                    'USER': username,
                    'LOGNAME': username,
                    'HOME': home,
                    'UID': str(uid),
                    'XDG_RUNTIME_DIR': uid_dir,
                    'DBUS_SESSION_BUS_ADDRESS': f'unix:path={uid_dir}/bus',
                    'DISPLAY': ':0',
                }
                if wayland_sock:
                    env['WAYLAND_DISPLAY'] = wayland_sock
                return username, uid, env
        except Exception:
            continue

    # Güvenli varsayılan
    return 'fsociecty', 1000, {
        'USER': 'fsociecty',
        'LOGNAME': 'fsociecty',
        'HOME': '/home/fsociecty',
        'UID': '1000',
        'XDG_RUNTIME_DIR': '/run/user/1000',
        'DBUS_SESSION_BUS_ADDRESS': 'unix:path=/run/user/1000/bus',
        'DISPLAY': ':0',
        'WAYLAND_DISPLAY': 'wayland-1',
    }

def notify_user(title, body, icon='utilities-system-monitor'):
    username, uid, env = get_active_user_env()
    try:
        cmd = [
            'sudo', '-u', username,
            'env',
            f'XDG_RUNTIME_DIR={env["XDG_RUNTIME_DIR"]}',
            f'DBUS_SESSION_BUS_ADDRESS={env["DBUS_SESSION_BUS_ADDRESS"]}',
            f'DISPLAY={env.get("DISPLAY", ":0")}',
        ]
        if 'WAYLAND_DISPLAY' in env:
            cmd.append(f'WAYLAND_DISPLAY={env["WAYLAND_DISPLAY"]}')
        cmd += ['notify-send', '-u', 'normal', '-i', icon, title, body]
        subprocess.run(cmd, timeout=2)
    except Exception as e:
        print(f"Notify error: {e}")

def get_platform_profile():
    # HP WMI veya ACPI Platform Profile
    acpi_paths = [
        '/sys/devices/platform/hp-wmi/platform-profile/platform-profile-0/profile',
        '/sys/firmware/acpi/platform_profile',
    ]
    for p in acpi_paths:
        if os.path.exists(p):
            try:
                with open(p, 'r') as f:
                    return f.read().strip()
            except Exception:
                pass
    try:
        res = subprocess.run(['powerprofilesctl', 'get'], stdout=subprocess.PIPE, text=True)
        return res.stdout.strip()
    except Exception:
        pass
    return 'balanced'

def set_platform_profile(mode):
    acpi_paths = [
        '/sys/devices/platform/hp-wmi/platform-profile/platform-profile-0/profile',
        '/sys/firmware/acpi/platform_profile',
    ]
    for p in acpi_paths:
        if os.path.exists(p):
            try:
                with open(p, 'w') as f:
                    f.write(mode)
                    return True
            except Exception:
                pass
    pp_mode = 'power-saver' if mode in ('quiet', 'cool') else mode
    try:
        subprocess.run(['powerprofilesctl', 'set', pp_mode], check=False)
        return True
    except Exception:
        pass
    return False

def get_sonsus_pids():
    username, uid, _ = get_active_user_env()
    try:
        res = subprocess.run(['pgrep', '-u', username, '-f', 'sonsus-engine'], stdout=subprocess.PIPE, text=True)
        pids = [int(p) for p in res.stdout.strip().split() if p.isdigit()]
        return pids
    except Exception:
        return []

def open_or_focus_sonsus():
    """
    Sonsus Engine'i başlatır veya zaten açıksa SIGUSR1 ile öne getirir.
    """
    pids = get_sonsus_pids()
    if pids:
        print(f"Sonsus Engine zaten açık (PIDler: {pids}), SIGUSR1 gönderiliyor...")
        for p in pids:
            try:
                os.kill(p, 10)  # SIGUSR1
            except Exception as e:
                print(f"Sinyal hatası ({p}): {e}")
        notify_user("🎮 Sonsus Engine", "Uygulama penceresi öne getirildi!", "utilities-system-monitor")
        return

    username, uid, env = get_active_user_env()
    binary_path = '/home/fsociecty/Masaüstü/launcher/src-tauri/target/release/sonsus-engine'
    print(f"Sonsus Engine başlatılıyor: {binary_path} (Kullanıcı: {username})")
    notify_user("🚀 Sonsus Engine", "Başlatılıyor...", "utilities-system-monitor")

    cmd = [
        'sudo', '-u', username,
        'env',
        f'USER={username}',
        f'LOGNAME={username}',
        f'HOME={env["HOME"]}',
        f'XDG_RUNTIME_DIR={env["XDG_RUNTIME_DIR"]}',
        f'DBUS_SESSION_BUS_ADDRESS={env["DBUS_SESSION_BUS_ADDRESS"]}',
        f'DISPLAY={env.get("DISPLAY", ":0")}',
    ]
    if 'WAYLAND_DISPLAY' in env:
        cmd.append(f'WAYLAND_DISPLAY={env["WAYLAND_DISPLAY"]}')
    cmd.append(binary_path)

    try:
        subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
    except Exception as e:
        print(f"Başlatma hatası: {e}")

def toggle_power_profile():
    """
    Çift basışta donanım fan/güç profilini değiştirir.
    """
    curr = get_platform_profile()
    if curr != 'performance':
        set_platform_profile('performance')
        notify_user("🔥 Sonsus Engine: PERFORMANS MODU", "Turbo Fanlar & Maksimum Saat Hızı Devrede!", "applications-games")
        print("Profil PERFORMANS moduna alındı")
    else:
        set_platform_profile('quiet')
        notify_user("🍃 Sonsus Engine: SESSIZ / OFİS MODU", "Fısıltı Fan Eğrisi & Düşük Güç Devrede!", "battery")
        print("Profil SESSIZ moda alındı")

click_count = 0
timer = None
lock = threading.Lock()

def timer_callback():
    global click_count, timer
    with lock:
        c = click_count
        click_count = 0
        timer = None

    if c == 1:
        # Tek Basış: Omen Hub tuşuna basıldığında Sonsus Engine'i AÇ!
        open_or_focus_sonsus()
    elif c >= 2:
        # Çift Basış: Hızlı Fan / Performans Modu Geçişi!
        toggle_power_profile()

def listen_device(dev):
    global click_count, timer
    try:
        with open(dev, 'rb', buffering=0) as f:
            while True:
                data = f.read(EVENT_SIZE)
                if len(data) == EVENT_SIZE:
                    tv_sec, tv_usec, ev_type, ev_code, ev_val = struct.unpack(FORMAT, data)
                    # Yalnızca Tuşa Basma Olayı (ev_type=1, ev_val=1)
                    if ev_type == 1 and ev_val == 1 and ev_code in GAMING_KEYS:
                        print(f"Gaming Key Algılandı: Kod={ev_code} Cihaz={dev}")
                        with lock:
                            click_count += 1
                            if timer is not None:
                                timer.cancel()
                            timer = threading.Timer(0.30, timer_callback)
                            timer.start()
    except Exception:
        pass

def main():
    print("Sonsus Engine Universal Gaming Key Daemon Başlatıldı...")
    devices = glob.glob('/dev/input/event*')
    threads = []
    for d in devices:
        t = threading.Thread(target=listen_device, args=(d,), daemon=True)
        t.start()
        threads.append(t)

    while True:
        time.sleep(10)

if __name__ == '__main__':
    main()
