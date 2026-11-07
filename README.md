# sonsus-engine

**sonsus-engine**, **Steam**, **Epic Games (Heroic / Legendary)** ve **GOG** oyun kütüphanelerini (hem yüklü hem buluttaki oyunları) tek bir yüksek performanslı, karanlık sinematik arayüzde birleştiren **Tauri v2 (Rust) + React 19 (TypeScript) + Tailwind CSS v4** tabanlı masaüstü oyun kütüphanesi yöneticisidir.

## Temel Özellikler

- **Çoklu Mağaza Kütüphane Toplayıcı:**
  - **Steam:** `libraryfolders.vdf`, `appmanifest_*.acf`, ikili `appcache/appinfo.vdf`, `localconfig.vdf` ve isteğe bağlı Steam Web API entegrasyonu.
  - **Epic Games:** Heroic Games Launcher (`legendary_library.json`, `images-cache`) ve Legendary (`installed.json`, `metadata/*.json`) entegrasyonu.
  - **GOG:** Heroic GOG (`gog_library.json`, `gog_store/installed.json`), Lutris SQLite (`pga.db`) ve yerel kurulum tarayıcısı.
- **Performans Odaklı Sinematik Arayüz:**
  - Asenkron özel medya protokolü (`krnlmedia://`), SQLite WAL önbellekleme, aşamalı yükleme ve 144Hz/180Hz uyumlu ivmeli tekerlek kaydırması.
- **Tam Ekran Oyun Detayları & Kurulum Akışı:**
  - Çevrimiçi oyun açıklamaları, ekran görüntüleri, sistem gereksinimleri, ProtonDB uyumluluk derecesi ve oyuncu incelemeleri.
  - Disk boş alan (`statvfs`) analiziyle kurulum dizini seçimi ve mevcut oyun klasörü bağlama.
- **Sistem Çözünürlük & Süreç Hook Motoru:**
  - Oyun öncesi `xrandr`, `kscreen-doctor` veya `gamescope` ile çözünürlük/Hz geçişi, `SIGSTOP`/`SIGCONT` arka plan süreç dondurma ve oyun çıkışında otomatik geri yükleme.

## Çalıştırma

```bash
chmod +x run.sh
./run.sh          # Optimize release ikilisini (varsa) veya geliştirme modunu başlatır
./run.sh --dev    # Canlı geliştirme (Vite HMR + Tauri) modunda başlatır
```
