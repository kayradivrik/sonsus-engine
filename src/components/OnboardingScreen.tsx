import { useEffect, useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  User,
  X,
} from "lucide-react";
import { tauriApi } from "../api/tauriClient";
import { SonsusLogo } from "./ui/SonsusLogo";
import { AppSettings, StoreAuthStatus } from "../types/game";
import { useTranslation } from "../i18n/useTranslation";

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
 * sonsus-engine Doğal ve Sade Giriş Ekranı.
 * Aşırı süslü yapay zeka tasarımlarından uzak, doğrudan Steam/Epic/GOG bağlantısı ve TR/EN dil seçici.
 */
export function OnboardingScreen({
  open,
  isFirstRun,
  settings,
  totalGamesCount: _totalGamesCount,
  onComplete,
  onClose,
  onNotify,
}: OnboardingScreenProps) {
  const { lang, setLang, t } = useTranslation();
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

  const handleConnectEpic = async () => {
    if (!epicCode.trim()) return;
    setEpicBusy(true);
    try {
      const name = await tauriApi.connectEpicAccount(epicCode.trim());
      setEpicCode("");
      setAccountsChanged(true);
      await refreshAuth();
      onNotify(lang === "tr" ? `Epic Games bağlandı: ${name}` : `Epic Games connected: ${name}`);
    } catch (e: any) {
      onNotify(String(e));
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
      onNotify(lang === "tr" ? "Epic Games bağlantısı kaldırıldı." : "Epic Games disconnected.");
    } catch (e: any) {
      onNotify(String(e));
    } finally {
      setEpicBusy(false);
    }
  };

  const handleConnectGog = async () => {
    if (!gogCode.trim()) return;
    setGogBusy(true);
    try {
      const name = await tauriApi.connectGogAccount(gogCode.trim());
      setGogCode("");
      setAccountsChanged(true);
      await refreshAuth();
      onNotify(lang === "tr" ? `GOG.com bağlandı: ${name}` : `GOG.com connected: ${name}`);
    } catch (e: any) {
      onNotify(String(e));
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
      onNotify(lang === "tr" ? "GOG.com bağlantısı kaldırıldı." : "GOG.com disconnected.");
    } catch (e: any) {
      onNotify(String(e));
    } finally {
      setGogBusy(false);
    }
  };

  const handleFinish = async () => {
    setEntering(true);
    try {
      const nextSettings: AppSettings = {
        ...settings,
        player_name: playerName.trim() || (lang === "tr" ? "Oyuncu" : "Player"),
        onboarding_completed: true,
      };
      await onComplete(nextSettings, accountsChanged);
    } finally {
      setEntering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-[#111118] via-[#0b0b10] to-[#060609] border border-white/15 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] p-7 sm:p-8 space-y-6 overflow-hidden">
        {/* Üst İnce Neon Vurgu Çizgisi */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        
        {/* Üst Logo & Dil Seçici */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner flex items-center justify-center">
              <SonsusLogo size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">
                  sonsus-engine
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-semibold">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                {t.welcomeSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* TR / EN Dil Seçim Butonları */}
            <div className="flex items-center p-1 rounded-xl bg-black/70 border border-white/10 shadow-inner text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLang("tr")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  lang === "tr"
                    ? "bg-white text-black font-extrabold shadow-sm scale-100"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  lang === "en"
                    ? "bg-white text-black font-extrabold shadow-sm scale-100"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>

            {!isFirstRun && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Oyuncu Adı Inputu */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-300 flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-zinc-400" />
            <span>{t.playerTagLabel}</span>
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder={t.playerTagPlaceholder}
            className="w-full h-10.5 px-4 rounded-xl bg-black/60 border border-white/10 hover:border-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/10 text-sm font-medium text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
          />
        </div>

        {/* Hesaplar / Kütüphaneler Bölümü */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            {t.accountsTitle}
          </div>

          {/* Steam */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/[0.08] hover:border-white/20 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/25 to-blue-900/10 border border-blue-500/30 text-blue-400 font-black text-sm flex items-center justify-center shadow-inner">
                ST
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Steam</span>
                  {auth?.steam_connected && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {lang === "tr" ? "Algılandı" : "Detected"}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {auth?.steam_connected
                    ? `${auth.steam_persona} • ID: ${auth.steam_id64?.slice(-6) || "..."}`
                    : t.steamNotFound}
                </div>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-400 font-medium font-mono">
              {auth?.steam_connected ? (lang === "tr" ? "Otomatik Bağlı" : "Auto-detected") : "—"}
            </span>
          </div>

          {/* Epic Games */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/[0.08] hover:border-white/20 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700/30 to-zinc-900 border border-white/15 text-white font-black text-sm flex items-center justify-center shadow-inner">
                  EP
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Epic Games</span>
                    {auth?.epic_connected && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {lang === "tr" ? "Bağlandı" : "Connected"}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {auth?.epic_connected ? auth.epic_display_name : t.epicNotConnected}
                  </div>
                </div>
              </div>

              {auth?.epic_connected ? (
                <button
                  type="button"
                  onClick={handleDisconnectEpic}
                  disabled={epicBusy}
                  className="h-7.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold cursor-pointer transition-colors"
                >
                  {t.disconnect}
                </button>
              ) : (
                <a
                  href={oauthUrls[0]}
                  target="_blank"
                  rel="noreferrer"
                  className="h-7.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>{t.getLoginCode}</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </a>
              )}
            </div>

            {!auth?.epic_connected && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder={t.pasteAuthCode}
                  value={epicCode}
                  onChange={(e) => setEpicCode(e.target.value)}
                  className="flex-1 h-9 px-3.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:border-white/30 outline-none"
                />
                <button
                  type="button"
                  onClick={handleConnectEpic}
                  disabled={!epicCode.trim() || epicBusy}
                  className="h-9 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-extrabold text-xs cursor-pointer transition-colors shadow-sm"
                >
                  {t.connect}
                </button>
              </div>
            )}
          </div>

          {/* GOG */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/[0.08] hover:border-white/20 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/25 to-purple-900/10 border border-purple-500/30 text-purple-400 font-black text-sm flex items-center justify-center shadow-inner">
                  GG
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>GOG.com</span>
                    {auth?.gog_connected && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {lang === "tr" ? "Bağlandı" : "Connected"}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {auth?.gog_connected ? auth.gog_username : t.gogNotConnected}
                  </div>
                </div>
              </div>

              {auth?.gog_connected ? (
                <button
                  type="button"
                  onClick={handleDisconnectGog}
                  disabled={gogBusy}
                  className="h-7.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold cursor-pointer transition-colors"
                >
                  {t.disconnect}
                </button>
              ) : (
                <a
                  href={oauthUrls[1]}
                  target="_blank"
                  rel="noreferrer"
                  className="h-7.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>{t.getLoginCode}</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </a>
              )}
            </div>

            {!auth?.gog_connected && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder={t.pasteGogCode}
                  value={gogCode}
                  onChange={(e) => setGogCode(e.target.value)}
                  className="flex-1 h-9 px-3.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:border-white/30 outline-none"
                />
                <button
                  type="button"
                  onClick={handleConnectGog}
                  disabled={!gogCode.trim() || gogBusy}
                  className="h-9 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-extrabold text-xs cursor-pointer transition-colors shadow-sm"
                >
                  {t.connect}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Başlat Butonu */}
        <button
          type="button"
          onClick={handleFinish}
          disabled={entering}
          className="w-full h-11.5 rounded-2xl bg-gradient-to-r from-white via-zinc-100 to-white hover:from-zinc-100 hover:to-zinc-200 text-black font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_10px_30px_rgba(255,255,255,0.15)] transition-all active:scale-[0.99] cursor-pointer"
        >
          <span>{isFirstRun ? t.continueBtn : t.saveAndEnter}</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>

      </div>
    </div>
  );
}
