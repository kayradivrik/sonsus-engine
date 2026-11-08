#!/usr/bin/env python3
"""
Sonsus Engine - Universal Gaming Key & Hardware Daemon
Desteklenen Markalar ve Donanımlar:
- Asus ROG / TUF: ROG Key (KEY_PROG1 / KEY_PROG3)
- Lenovo Legion: Legion Fn+Q / Vantage Key (KEY_PROG1 / KEY_PROG2)
- HP Omen / Victus: Omen Gaming Hub Key (KEY_PROG2)
- Dell Alienware: Alienware Command Center Key
- Evrensel / Herhangi Bir Bilgisayar: F12 veya Özel Klavye Oyun Tuşları
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
# 149: KEY_PROG2 (HP Omen / Victus)
# 202: KEY_PROG3 (Asus TUF Gaming)
# 203: KEY_PROG4
# 156: KEY_BOOKMARKS / Game Center
GAMING_KEYS = {148, 149, 202, 203, 156}

def get_current_username():
    # Aktif masaüstü kullanıcısını bul
    try:
        user = subprocess.check_output(['loginctl', 'list-users'], text=True)
        for line in user.splitlines():
            parts = line.split()
            if len(parts) >= 2 and parts[0].isdigit() and parts[0] != '0':
                return parts[1]
    except Exception:
        pass
    return os.environ.get('SUDO_USER') or os.environ.get('USER') or 'fsociecty'

USERNAME = get_current_username()
USER_ID = 1000
try:
    import pwd
    USER_ID = pwd.getpwnam(USERNAME).pw_uid
except Exception:
    pass

def notify_user(title, body, icon='dialog-information'):
    try:
        subprocess.run([
            'sudo', '-u', USERNAME,
            'env',
            f'DISPLAY={os.environ.get("DISPLAY", ":0")}',
            f'WAYLAND_DISPLAY={os.environ.get("WAYLAND_DISPLAY", "wayland-0")}',
            f'XDG_RUNTIME_DIR=/run/user/{USER_ID}',
            f'DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/{USER_ID}/bus',
            'notify-send',
            '-u', 'normal',
            '-i', icon,
            title,
            body
        ], timeout=2)
    except Exception:
        pass

def get_platform_profile():
    # 1. Evrensel Linux ACPI Platform Profile
    acpi_path = '/sys/firmware/acpi/platform_profile'
    if os.path.exists(acpi_path):
        try:
            with open(acpi_path, 'r') as f:
                return f.read().strip()
        except Exception:
            pass
    # 2. powerprofilesctl Fallback
    try:
        res = subprocess.run(['powerprofilesctl', 'get'], stdout=subprocess.PIPE, text=True)
        return res.stdout.strip()
    except Exception:
        pass
    return 'balanced'

def set_platform_profile(mode):
    acpi_path = '/sys/firmware/acpi/platform_profile'
    if os.path.exists(acpi_path):
        try:
            with open(acpi_path, 'w') as f:
                f.write(mode)
                return True
        except Exception:
            pass
    # powerprofilesctl fallback
    pp_mode = 'power-saver' if mode in ('quiet', 'cool') else mode
    try:
        subprocess.run(['powerprofilesctl', 'set', pp_mode], check=False)
        return True
    except Exception:
        pass
    return False

def on_single_click():
    curr = get_platform_profile()
    if curr != 'performance':
        set_platform_profile('performance')
        notify_user("🔥 Sonsus Engine: PERFORMANS MODU", "Oyun & Turbo Fanlar Devrede!", "applications-games")
        print("Profile switched to PERFORMANCE")
    else:
        set_platform_profile('quiet')
        notify_user("🍃 Sonsus Engine: SESSIZ / OFİS MODU", "Düşük Güç & Fısıltı Sessizliği Devrede!", "battery")
        print("Profile switched to QUIET")

def is_sonsus_running():
    try:
        res = subprocess.run(['pgrep', '-u', USERNAME, '-f', 'sonsus-engine'], stdout=subprocess.PIPE)
        return len(res.stdout.strip()) > 0
    except Exception:
        return False

def on_double_click():
    if is_sonsus_running():
        notify_user("🎮 Sonsus Engine", "Uygulama zaten açık!", "utilities-system-monitor")
        return
    notify_user("🚀 Sonsus Engine", "Başlatılıyor...", "utilities-system-monitor")
    subprocess.Popen([
        'systemd-run',
        '--user',
        f'--machine={USERNAME}@.host',
        '/home/fsociecty/Masaüstü/launcher/src-tauri/target/release/sonsus-engine'
    ])

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
        on_single_click()
    elif c >= 2:
        on_double_click()

def listen_device(dev):
    global click_count, timer
    try:
        with open(dev, 'rb', buffering=0) as f:
            while True:
                data = f.read(EVENT_SIZE)
                if len(data) == EVENT_SIZE:
                    tv_sec, tv_usec, ev_type, ev_code, ev_val = struct.unpack(FORMAT, data)
                    if ev_type == 1 and ev_val == 1 and ev_code in GAMING_KEYS:
                        print(f"Gaming Key Pressed: {ev_code} on {dev}")
                        with lock:
                            click_count += 1
                            if timer is not None:
                                timer.cancel()
                            timer = threading.Timer(0.35, timer_callback)
                            timer.start()
    except Exception:
        pass

def main():
    print("Sonsus Engine Universal Game Key Daemon Başlatıldı...")
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
