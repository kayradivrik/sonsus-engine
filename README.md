# sonsus-engine

**sonsus-engine**, **Linux** ve **Windows** üzerinde çalışan; **Steam**, **Epic Games**, **GOG** ve **Harici / Yerel** oyun kütüphanelerini (hem yüklü hem buluttaki oyunları) tek bir yüksek performanslı, `#000000` sinematik arayüzde birleştiren **Tauri v2 (Rust) + React 19 (TypeScript) + Tailwind CSS v4** tabanlı masaüstü oyun kütüphanesi yöneticisidir.

## Temel Özellikler (`v0.3.0`)

- **Sinematik Giriş / Karşılama & Doğrudan Mağaza OAuth Merkezi:**
  - İlk açılışta (ve istenildiği an üst profil kapsülünden) açılan `#000000` karşılama ekranı.
  - Heroic Games Launcher kurulu olmasa bile **Epic Games** (`legendary auth`) ve **GOG.com** (`auth.gog.com` OAuth2) hesaplarına doğrudan giriş/çıkış ve bulut kütüphane senkronizasyonu; açık **Steam** hesabını (`PersonaName` & `ID64`) şifresiz otomatik algılama.
- **Uygulama İçi İndirme, Dosya Doğrulama/Onarma, Güncelleme & Kaldırma:**
  - Harici istemci veya terminal açmadan Epic (`legendary`) ve GOG (`gogdl`) oyunlarını doğrudan seçilen diske indirme (`%`, `MiB/s`, `ETA`, Duraklat / Devam Et / İptal).
  - Yüklü oyunlar için **Dosya Doğrula / Onar**, **Güncelleme Kontrolü** ve **Oyunu Kaldır (Uninstall)** aksiyonları.
- **Favoriler, Oyun Gizleme, "Son Oynananlar" Rafı & `Ctrl+K` Hızlı Başlatıcı:**
  - Kalıcı SQLite `user_game_prefs` ile favorilere ekleme, istenmeyen oyunları gizleme, kütüphane üstünde **Son Oynananlar & Devam Et** şeridi ve klavyeden `Ctrl+K` ile anında oyun başlatma paleti.
- **Harici / Özel Oyun (`.exe`, `.AppImage`, `.sh`) Ekleme & Otomatik Poster:**
  - Mağaza dışı yerel oyunları ve emülatörleri kütüphaneye bağlama; eklendiği anda SteamGridDB / Steam CDN üzerinden otomatik dikey poster eşitleme.
- **Proton / GE-Proton Seçici, MangoHud, Gamescope FSR & Çözünürlük Hook'ları:**
  - Sistemdeki `compatibilitytools.d`, Steam Proton ve Wine sürümlerini otomatik tarama; oyun bazlı Proton/Wine seçimi, **MangoHud** FPS katmanı, **Gamescope AMD FSR**, özel ortam değişkenleri (`KEY=VALUE`), `xrandr`/`kscreen-doctor` çözünürlük geçişi ve `SIGSTOP`/`SIGCONT` süreç yönetimi.
- **Tahmini Bitirme Süresi, Canlı Oyuncu Sayısı & Kütüphane İstatistik Paneli:**
  - Oyun detayında **Ana Hikaye / Ana+Ekstra / %100 Bitirme** tahmini süreleri, anlık eşzamanlı oyuncu sayısı (`CCU`), topluluk beğeni yüzdesi ve tüm kütüphaneyi analiz eden **Bento İstatistik Paneli**.

## Çalıştırma

```bash
chmod +x run.sh
./run.sh          # Optimize release ikilisini (varsa) veya geliştirme modunu başlatır
./run.sh --dev    # Canlı geliştirme (Vite HMR + Tauri) modunda başlatır
```
