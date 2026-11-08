import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { tauriApi } from "../api/tauriClient";
import { SonsusLogo } from "./ui/SonsusLogo";
import { AppSettings, StoreAuthStatus } from "../types/game";

interface OnboardingScreenProps {
  open: boolean;
  isFirstRun: boolean;
  settings: AppSettings;
  totalGamesCount: number;
  onComplete: (nextSettings: AppSettings, shouldRescan: boolean) => Promise<void>;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

/**
 * `sonsus-engine` Sinematik Giriş, Karşılama & Doğrudan Mağaza Hesap Bağlantı Ekranı.
 * İlk açılışta otomatik gelir; sonrasında üst profil kapsülünden istenildiği an tekrar açılabilir.
 */
export function OnboardingScreen({
  open,
  isFirstRun,
  settings,
  totalGamesCount,
  onComplete,
  onClose,
  onNotify,
}: OnboardingScreenProps) {
  const [playerName, setPlayerName] = useState(settings.player_name ?? "");
  const [auth, setAuth] = useState<StoreAuthStatus | null>(null);
  const [oauthUrls, setOauthUrls] = useState<[string, string]>(["", ""]);
  const [epicCode, setEpicCode] = useState("");
  const [gogCode, setGogCode] = useState("");
  const [epicBusy, setEpicBusy] = useState(false);
  const [gogBusy, setGogBusy] = useState(false);
  const [entering, setEntering] = useState(false);
  const [accountsChanged, setAccountsChanged] = useState(false);

  const refreshAuth = async () => {
    try {
      const st = await tauriApi.getStoreAuthStatus();
      setAuth(st);
      setPlayerName((prev) => {
        if (prev.trim()) return prev;
        return st.steam_persona || st.epic_display_name || st.gog_username || "";
      });
    } catch {
      // Yoksay
    }
  };

  useEffect(() => {
    if (!open) return;
    setPlayerName(settings.player_name ?? "");
    setAccountsChanged(false);
    refreshAuth();
    tauriApi
      .getOauthLoginUrls()
      .then(setOauthUrls)
      .catch(() => {});
  }, [open, settings.player_name]);

  if (!open) return null;

  const connectedCount =
    (auth?.steam_connected ? 1 : 0) +
    (auth?.epic_connected ? 1 : 0) +
    (auth?.gog_connected ? 1 : 0);

  const handleOpenExternal = async (url: string) => {
    if (!url) return;
    try {
      await tauriApi.openExternalUrl(url);
    } catch (err) {
      onNotify(`Tarayıcı açılamadı: ${String(err)}`);
    }
  };

  const handleConnectEpic = async () => {
    if (!epicCode.trim()) {
      onNotify("Lütfen Epic Games yetkilendirme kodunu veya JSON çıktısını yapıştırın.");
      return;
    }
    setEpicBusy(true);
    try {
      const name = await tauriApi.connectEpicAccount(epicCode.trim());
      setEpicCode("");
      setAccountsChanged(true);
      await refreshAuth();
      onNotify(`Epic Games hesabı bağlandı: ${name}`);
    } catch (err) {
      onNotify(String(err));
    } finally {
      setEpicBusy(false);
    }
  };

  const handleDisconnectEpic = async () => {
    setEpicBusy(true);
    try {
      await tauriApi.disconnectEpicAccount();
      setAccountsChanged(true);
      await refreshAuth();
      onNotify("Epic Games oturumu kapatıldı.");
    } catch (err) {
      onNotify(String(err));
    } finally {
      setEpicBusy(false);
    }
  };

  const handleConnectGog = async () => {
    if (!gogCode.trim()) {
      onNotify("Lütfen GOG yönlendirme adresini (?code=...) veya kodu yapıştırın.");
      return;
    }
    setGogBusy(true);
    try {
      const info = await tauriApi.connectGogAccount(gogCode.trim());
      setGogCode("");
      setAccountsChanged(true);
      await refreshAuth();
      onNotify(`GOG hesabı bağlandı: ${info}`);
    } catch (err) {
      onNotify(String(err));
    } finally {
      setGogBusy(false);
    }
  };

  const handleDisconnectGog = async () => {
    setGogBusy(true);
    try {
      await tauriApi.disconnectGogAccount();
      setAccountsChanged(true);
      await refreshAuth();
      onNotify("GOG oturumu kapatıldı.");
    } catch (err) {
      onNotify(String(err));
    } finally {
      setGogBusy(false);
    }
  };

  const handleEnterLibrary = async () => {
    setEntering(true);
    try {
      const next: AppSettings = {
        ...settings,
        player_name: playerName.trim() || null,
        onboarding_completed: true,
      };
      await onComplete(next, accountsChanged || isFirstRun);
    } finally {
      setEntering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-zinc-100 flex flex-col overflow-y-auto animate-fade-in">
      {/* Sinematik Üst Işık Hüzmesi */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.07),_transparent_58%)]" />

      {/* Üst Çubuk */}
      <div className="relative z-10 max-w-[1220px] w-full mx-auto px-6 sm:px-10 pt-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SonsusLogo size={28} />
          <span className="text-base font-bold tracking-tight text-white">
            sonsus-engine
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-white/[0.07] border border-white/10 text-zinc-300">
            v0.3 • Oturum & Hesap Merkezi
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshAuth}
            className="h-8 px-3 rounded-full bg-[#111116] hover:bg-[#1a1a22] border border-white/10 text-xs text-zinc-300 flex items-center gap-1.5 cursor-pointer"
            title="Hesap durumlarını yeniden kontrol et"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Yenile</span>
          </button>

          {!isFirstRun && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#111116] hover:bg-[#1a1a22] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Ana Giriş & Karşılama İçeriği */}
      <div className="relative z-10 flex-1 max-w-[1220px] w-full mx-auto px-6 sm:px-10 py-8 flex flex-col justify-center gap-8">
        {/* Karşılama Başlığı & Oyuncu Kimliği */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-zinc-300 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Steam • Epic Games • GOG • Yerel Oyunlar Tek Çatıda</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-white leading-[1.08]">
              {isFirstRun
                ? "sonsus-engine'e Hoş Geldin."
                : "Oyuncu Profili & Mağaza Hesapları"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Harici bir başlatıcıya ihtiyaç duymadan mağaza hesaplarını doğrudan bağla,
              buluttaki ve diskindeki tüm oyunları tek ekranda yönet, indir ve başlat.
            </p>
          </div>

          {/* Oyuncu Profil Kapsülü */}
          <div className="w-full lg:w-80 p-4 rounded-2xl bg-[#09090d] border border-white/[0.09] space-y-2">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
              <User className="w-3.5 h-3.5 text-zinc-300" />
              <span>Oyuncu Adı / Profil Etiketi</span>
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Örn: Kayra"
              className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs font-semibold text-white placeholder:text-zinc-600 outline-none"
            />
          </div>
        </div>

        {/* 3'lü Mağaza Oturum Bento Izgarası */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. STEAM KARTI */}
          <div className="p-5 rounded-2xl bg-[#09090d] border border-white/[0.09] flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-white text-black text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-[4px]">
                  STEAM
                </span>
                {auth?.steam_connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white border border-white/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Algılandı</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-white/[0.05] text-zinc-400 border border-white/10">
                    Yerel Oturum Bekleniyor
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-base font-bold text-white">
                  {auth?.steam_persona
                    ? auth.steam_persona
                    : "Steam Masaüstü İstemcisi"}
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {auth?.steam_connected
                    ? `Steam ID64 (${auth.steam_id64}) üzerinden yerel VDF/ACF manifestoları ve bulut kütüphaneniz otomatik okunuyor.`
                    : "Bilgisayarınızda açık olan Steam istemcisi otomatik taranır. Farklı bir diskteyse Ayarlar'dan kök dizin seçebilirsiniz."}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>Şifre gerekmez (Yerel VDF)</span>
              </span>
              {auth?.steam_connected && (
                <span className="text-white font-semibold">Hazır</span>
              )}
            </div>
          </div>

          {/* 2. EPIC GAMES DOĞRUDAN OAUTH KARTI */}
          <div className="p-5 rounded-2xl bg-[#09090d] border border-white/[0.09] flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-white text-black text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-[4px]">
                  EPIC GAMES
                </span>
                {auth?.epic_connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white border border-white/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Bağlı</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-white/[0.05] text-zinc-400 border border-white/10">
                    Doğrudan Giriş
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-base font-bold text-white">
                  {auth?.epic_display_name || "Epic Games Store"}
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {auth?.epic_connected
                    ? "Epic kütüphaneniz, bulut oyunlarınız ve uygulama içi doğrudan indirme motoru aktif."
                    : "1) Giriş sayfasını açıp hesabınıza girin. 2) Ekrandaki JSON veya authorizationCode değerini aşağıya yapıştırın."}
                </p>
              </div>

              {!auth?.epic_connected && (
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenExternal(oauthUrls[0])}
                    className="w-full h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-100 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>1. Epic Giriş Sayfasını Aç</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  </button>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={epicCode}
                      onChange={(e) => setEpicCode(e.target.value)}
                      placeholder='2. Kodu veya {"authorizationCode":...} yapıştır'
                      className="flex-1 h-9 rounded-xl bg-black border border-white/12 focus:border-white/40 px-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none"
                    />
                    <button
                      type="button"
                      disabled={epicBusy}
                      onClick={handleConnectEpic}
                      className="h-9 px-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {epicBusy ? "..." : "Bağla"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Resmi OAuth2 Kodu</span>
              </span>
              {auth?.epic_connected && (
                <button
                  type="button"
                  disabled={epicBusy}
                  onClick={handleDisconnectEpic}
                  className="text-zinc-400 hover:text-rose-400 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Oturumu Kapat</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. GOG.COM DOĞRUDAN OAUTH KARTI */}
          <div className="p-5 rounded-2xl bg-[#09090d] border border-white/[0.09] flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-white text-black text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-[4px]">
                  GOG.COM
                </span>
                {auth?.gog_connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white border border-white/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Bağlı</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-white/[0.05] text-zinc-400 border border-white/10">
                    Doğrudan Giriş
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-base font-bold text-white">
                  {auth?.gog_username || "GOG Galaxy Bulut"}
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {auth?.gog_connected
                    ? "DRM-free GOG kütüphaneniz eşitlendi ve doğrudan uygulama içi indirmeye hazır."
                    : "1) GOG giriş ekranını açıp giriş yapın. 2) Yönlendirilen boş sayfanın adres çubuğundaki URL'yi (?code=...) yapıştırın."}
                </p>
              </div>

              {!auth?.gog_connected && (
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenExternal(oauthUrls[1])}
                    className="w-full h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-100 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>1. GOG Giriş Sayfasını Aç</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  </button>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gogCode}
                      onChange={(e) => setGogCode(e.target.value)}
                      placeholder="2. Yönlendirme URL'sini veya kodu yapıştır"
                      className="flex-1 h-9 rounded-xl bg-black border border-white/12 focus:border-white/40 px-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none"
                    />
                    <button
                      type="button"
                      disabled={gogBusy}
                      onClick={handleConnectGog}
                      className="h-9 px-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {gogBusy ? "..." : "Bağla"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>GOG OAuth2 Token</span>
              </span>
              {auth?.gog_connected && (
                <button
                  type="button"
                  disabled={gogBusy}
                  onClick={handleDisconnectGog}
                  className="text-rose-400 hover:text-rose-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Oturumu Kapat</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Alt Aksiyon Barı */}
        <div className="p-5 rounded-2xl bg-[#09090d] border border-white/[0.09] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            <span className="px-3 py-1 rounded-full bg-white/[0.06] text-zinc-200 font-semibold">
              {connectedCount} / 3 Mağaza Aktif
            </span>
            <span>
              Şu an kütüphanede{" "}
              <strong className="text-white tabular-nums">
                {totalGamesCount.toLocaleString("tr-TR")}
              </strong>{" "}
              oyun hazır. İstersen hesap bağlamadan da devam edebilirsin.
            </span>
          </div>

          <button
            type="button"
            disabled={entering}
            onClick={handleEnterLibrary}
            className="w-full sm:w-auto h-12 px-8 rounded-full bg-white hover:bg-zinc-200 active:scale-[0.98] text-black font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <span>
              {entering
                ? "Kütüphane Hazırlanıyor..."
                : isFirstRun
                ? "Kütüphaneye Giriş Yap"
                : "Kaydet ve Kütüphaneye Dön"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

