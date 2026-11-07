# sonsus-engine

**sonsus-engine**, **Linux** ve **Windows** üzerinde çalışan; **Steam**, **Epic Games (Heroic / Legendary / Resmi Epic Games Launcher)** ve **GOG (Heroic / Lutris / GOG Galaxy 2.0)** oyun kütüphanelerini (hem yüklü hem buluttaki oyunları) tek bir yüksek performanslı, `#000000` sinematik arayüzde birleştiren **Tauri v2 (Rust) + React 19 (TypeScript) + Tailwind CSS v4** tabanlı masaüstü oyun kütüphanesi yöneticisidir.

## Temel Özellikler

- **Çapraz Platform (Linux + Windows) Çoklu Mağaza Toplayıcı:**
  - **Steam:** `libraryfolders.vdf`, `appmanifest_*.acf`, ikili `appcache/appinfo.vdf`, `localconfig.vdf`, Windows Kayıt Defteri (`HKCU\Software\Valve\Steam`) ve isteğe bağlı Steam Web API entegrasyonu.
  - **Epic Games:** Linux/Windows Heroic (`legendary_library.json`, `gog_api_info.json`), Legendary (`installed.json`, `metadata/*.json`) ve Windows Resmi Epic Games Launcher (`Manifests/*.item`) entegrasyonu.
  - **GOG:** Heroic GOG (`gog_library.json`, `gog_store/installed.json`), Lutris SQLite (`pga.db`), Windows GOG Galaxy 2.0 (`galaxy-2.0.db`) ve yerel kurulum (`goggame-*.info`) tarayıcısı.
- **Uygulama İçi Arka Plan İndirme Yöneticisi:**
  - Harici Heroic veya terminal penceresi açmadan Epic (`legendary`) ve GOG (`gogdl`) oyunlarını doğrudan uygulama içinde arka planda indirme; canlı `%`, hız (`MiB/s`), `ETA`, **Duraklat / Devam Et / İptal** desteği.
- **Doğrudan Çoklu Mağaza Veri Motoru:**
  - Epic Games Store Türkçe API, GOGDB, GOG v2 API, Steam Store API ve ProtonDB kaynaklarını paralel birleştirerek oyun açıklaması, Minimum/Önerilen sistem gereksinimleri, indirme/kurulum boyutu, HD ekran görüntüleri ve oyuncu incelemeleri.
- **Sayfalama (Pagination) & Akıcı Performans:**
  - Özelleştirilebilir (`24 / 48 / 96`) sayfalama çubuğu, asenkron yerel medya protokolü (`sonsusmedia://`), SQLite WAL önbellekleme ve 144Hz/180Hz uyumlu ivmeli kaydırma.
- **Sistem Çözünürlük & Süreç Hook Motoru:**
  - Oyun öncesi `xrandr`, `kscreen-doctor` veya `gamescope` ile çözünürlük/Hz geçişi, `SIGSTOP`/`SIGCONT` arka plan süreç dondurma ve oyun çıkışında otomatik geri yükleme.

## Çalıştırma

```bash
chmod +x run.sh
./run.sh          # Optimize release ikilisini (varsa) veya geliştirme modunu başlatır
./run.sh --dev    # Canlı geliştirme (Vite HMR + Tauri) modunda başlatır
```
