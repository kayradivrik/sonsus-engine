import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
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
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-xl bg-[#09090d] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Üst Logo & Dil Seçici */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SonsusLogo size={32} />
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                sonsus-engine
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">
                {t.welcomeSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* TR / EN Dil Seçim Butonları */}
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLang("tr")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  lang === "tr" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  lang === "en" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>

            {!isFirstRun && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Oyuncu Adı Inputu */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-zinc-400" />
            <span>{t.playerTagLabel}</span>
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder={t.playerTagPlaceholder}
            className="w-full h-10 px-3.5 rounded-xl bg-zinc-900/90 border border-white/10 text-sm text-white focus:border-white/30 placeholder-zinc-500"
          />
        </div>

        {/* Hesaplar / Kütüphaneler Bölümü */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            {t.accountsTitle}
          </div>

          {/* Steam */}
          <div className="p-4 rounded-xl bg-[#0d0d12] border border-white/10 hover:border-white/20 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-900/10 border border-blue-500/30 text-blue-400 font-black text-xs flex items-center justify-center shadow-inner">
                ST
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Steam</span>
                  {auth?.steam_connected && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {auth?.steam_connected
                    ? `${auth.steam_persona} • ID: ${auth.steam_id64?.slice(-6) || "..."}`
                    : t.steamNotFound}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-400 font-medium font-mono">
              {auth?.steam_connected ? (lang === "tr" ? "Otomatik Bağlandı" : "Auto-detected") : "—"}
            </span>
          </div>

          {/* Epic Games */}
          <div className="p-4 rounded-xl bg-[#0d0d12] border border-white/10 hover:border-white/20 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-700/30 to-zinc-900 border border-white/15 text-white font-black text-xs flex items-center justify-center shadow-inner">
                  EP
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Epic Games</span>
                    {auth?.epic_connected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {auth?.epic_connected ? auth.epic_display_name : t.epicNotConnected}
                  </div>
                </div>
              </div>

              {auth?.epic_connected ? (
                <button
                  type="button"
                  onClick={handleDisconnectEpic}
                  disabled={epicBusy}
                  className="h-7 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold cursor-pointer transition-colors"
                >
                  {t.disconnect}
                </button>
              ) : (
                <a
                  href={oauthUrls[0]}
                  target="_blank"
                  rel="noreferrer"
                  className="h-7 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
                  className="flex-1 h-8 px-3 rounded-lg bg-zinc-950 border border-white/10 text-xs text-white placeholder-zinc-500 focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={handleConnectEpic}
                  disabled={!epicCode.trim() || epicBusy}
                  className="h-8 px-4 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-extrabold text-xs cursor-pointer transition-colors"
                >
                  {t.connect}
                </button>
              </div>
            )}
          </div>

          {/* GOG */}
          <div className="p-4 rounded-xl bg-[#0d0d12] border border-white/10 hover:border-white/20 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-900/10 border border-purple-500/30 text-purple-400 font-black text-xs flex items-center justify-center shadow-inner">
                  GG
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>GOG.com</span>
                    {auth?.gog_connected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {auth?.gog_connected ? auth.gog_username : t.gogNotConnected}
                  </div>
                </div>
              </div>

              {auth?.gog_connected ? (
                <button
                  type="button"
                  onClick={handleDisconnectGog}
                  disabled={gogBusy}
                  className="h-7 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold cursor-pointer transition-colors"
                >
                  {t.disconnect}
                </button>
              ) : (
                <a
                  href={oauthUrls[1]}
                  target="_blank"
                  rel="noreferrer"
                  className="h-7 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
                  className="flex-1 h-8 px-3 rounded-lg bg-zinc-950 border border-white/10 text-xs text-white placeholder-zinc-500 focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={handleConnectGog}
                  disabled={!gogCode.trim() || gogBusy}
                  className="h-8 px-4 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-extrabold text-xs cursor-pointer transition-colors"
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
          className="w-full h-11 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.99] cursor-pointer"
        >
          <span>{isFirstRun ? t.continueBtn : t.saveAndEnter}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
