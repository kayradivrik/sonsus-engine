#!/usr/bin/env python3
import struct
import subprocess
import os
import sys
import time
import threading

FORMAT = 'qqHHI'
EVENT_SIZE = struct.calcsize(FORMAT)

dev_path = None
with open('/proc/bus/input/devices', 'r') as f:
    for block in f.read().split('\n\n'):
        if 'HP WMI hotkeys' in block:
            for line in block.split('\n'):
                if 'Handlers=' in line:
                    for h in line.split():
                        if h.startswith('event'):
                            dev_path = f'/dev/input/{h}'
                            break

if not dev_path or not os.path.exists(dev_path):
    dev_path = '/dev/input/event11'

print(f"OMEN Advanced Controller active on {dev_path}")

PROFILE_PATH = '/sys/devices/platform/hp-wmi/platform-profile/platform-profile-0/profile'

def notify_user(title, body, icon='dialog-information'):
    try:
        subprocess.run([
            'sudo', '-u', 'fsociecty',
            'env',
            'DISPLAY=:0',
            'WAYLAND_DISPLAY=wayland-0',
            'XDG_RUNTIME_DIR=/run/user/1000',
            'DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus',
            'notify-send',
            '-u', 'normal',
            '-i', icon,
            title,
            body
        ], timeout=2)
    except Exception as e:
        print(f"Notify error: {e}")

def get_current_profile():
    try:
        if os.path.exists(PROFILE_PATH):
            with open(PROFILE_PATH, 'r') as f:
                return f.read().strip()
    except Exception:
        pass
    return 'balanced'

def set_profile(profile_name):
    try:
        if os.path.exists(PROFILE_PATH):
            with open(PROFILE_PATH, 'w') as f:
                f.write(profile_name)
    except Exception as e:
        print(f"Set profile error: {e}")

def on_single_click():
    current = get_current_profile()
    if current != 'performance':
        set_profile('performance')
        notify_user("🔥 HP Victus: PERFORMANS MODU", "Oyun & Turbo Fanlar Devrede!", "applications-games")
        print("Switched to PERFORMANCE mode")
    else:
        set_profile('quiet')
        notify_user("🍃 HP Victus: OFİS / SESSİZ MOD", "Düşük Güç & Fısıltı Sessizliği Devrede!", "battery")
        print("Switched to QUIET / OFFICE mode")

def is_sonsus_running():
    try:
        res = subprocess.run(['pgrep', '-u', 'fsociecty', '-f', 'target/release/sonsus-engine'], stdout=subprocess.PIPE)
        return len(res.stdout.strip()) > 0
    except Exception:
        return False

def on_double_click():
    if is_sonsus_running():
        notify_user("🎮 Sonsus Engine", "Uygulama zaten açık!", "utilities-system-monitor")
        print("Sonsus Engine already running, skipping launch.")
        return

    notify_user("🚀 Sonsus Engine", "Başlatılıyor...", "utilities-system-monitor")
    subprocess.Popen([
        'systemd-run',
        '--user',
        '--machine=fsociecty@.host',
        '/home/fsociecty/Masaüstü/launcher/src-tauri/target/release/sonsus-engine'
    ])
    print("Launched Sonsus Engine via double-click")

click_count = 0
timer = None
lock = threading.Lock()

def timer_callback():
    global click_count, timer
    with lock:
        count = click_count
        click_count = 0
        timer = None
    
    if count == 1:
        on_single_click()
    elif count >= 2:
        on_double_click()

try:
    with open(dev_path, 'rb', buffering=0) as f:
        while True:
            data = f.read(EVENT_SIZE)
            if len(data) == EVENT_SIZE:
                tv_sec, tv_usec, ev_type, ev_code, ev_val = struct.unpack(FORMAT, data)
                if ev_type == 1 and ev_code == 149 and ev_val == 1:
                    with lock:
                        click_count += 1
                        if timer is not None:
                            timer.cancel()
                        timer = threading.Timer(0.35, timer_callback)
                        timer.start()
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
