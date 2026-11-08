import React, { useState, useEffect } from "react";
import { Zap, Check, X, Shield, RefreshCw } from "lucide-react";
import { UltraPerfStatus, SteamEsportsPresetPayload } from "../types/game";
import { tauriApi } from "../api/tauriClient";

interface UltraFpsModalProps {
  onClose: () => void;
}

export const UltraFpsModal: React.FC<UltraFpsModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<UltraPerfStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // CS2 Ayarı: Varsayılan 1000x1000 Stretched
  const [cs2Mode, setCs2Mode] = useState<"gamescope_stretched" | "native_max_fps">(
    "gamescope_stretched"
  );
  const [restartSteam, setRestartSteam] = useState(true);

  const loadStatus = async () => {
    try {
      const data = await tauriApi.getUltraPerfStatus();
      setStatus(data);
    } catch (e: any) {
      setActionMsg(`Hata: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const isBoosted = status?.current_governor === "performance";

  const handleToggleBoost = async () => {
    setIsBusy(true);
    try {
      if (isBoosted) {
        const res = await tauriApi.stopExtremeBoostNow();
        setActionMsg(res);
      } else {
        const res = await tauriApi.triggerExtremeBoostNow();
        setActionMsg(res);
      }
      await loadStatus();
    } catch (e: any) {
      setActionMsg(`Hata: ${e}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleInstallHelper = async () => {
    setIsBusy(true);
    setActionMsg("Yönetici yetkisi bekleniyor...");
    try {
      const res = await tauriApi.installBoostHelper();
      setActionMsg(res);
      await loadStatus();
    } catch (e: any) {
      setActionMsg(`Yetkilendirme hatası: ${e}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleApplyCs2 = async () => {
    setIsBusy(true);
    setActionMsg("CS2 Steam başlatma parametreleri güncelleniyor...");
    try {
      const payload: SteamEsportsPresetPayload = {
        appid: "730",
        mode: cs2Mode,
        internal_w: cs2Mode === "gamescope_stretched" ? 1000 : undefined,
        internal_h: cs2Mode === "gamescope_stretched" ? 1000 : undefined,
        output_w: 1920,
        output_h: 1080,
        refresh_hz: 180,
        prefer_output: "HDMI-A-1",
        restart_steam: restartSteam,
      };
      const res = await tauriApi.applySteamEsportsPreset(payload);
      setActionMsg(res);
      await loadStatus();
    } catch (e: any) {
      setActionMsg(`CS2 kancası uygulanamadı: ${e}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0b0b0f] border border-white/10 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        {/* Üst Başlık */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Ultra FPS Modu
              </h2>
              <p className="text-[11px] text-zinc-400">
                Linux çekirdeğini ve donanımı maksimum performansa odaklar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Gövde */}
        <div className="p-6 space-y-5">
          {actionMsg && (
            <div className="p-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-200 flex items-center justify-between">
              <span className="line-clamp-2">{actionMsg}</span>
              <button
                type="button"
                onClick={() => setActionMsg(null)}
                className="text-zinc-400 hover:text-white ml-2 shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Sistem durumu kontrol ediliyor...</span>
            </div>
          ) : (
            <>
              {/* 1. Ana Hızlandırma Kartı */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Çekirdek & Donanım Kilidi
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        isBoosted
                          ? "bg-white text-black border-white"
                          : "bg-zinc-900 text-zinc-400 border-white/10"
                      }`}
                    >
                      {isBoosted ? "Aktif" : "Standart"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed max-w-sm">
                    İşlemciyi tepe frekansta tutar, arka planı kısıtlar ve sıfır gecikme modu uygular.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleBoost}
                  disabled={isBusy}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-50 outline-none ${
                    isBoosted
                      ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10"
                      : "bg-white hover:bg-zinc-200 text-black shadow-md"
                  }`}
                >
                  {isBusy
                    ? "İşleniyor..."
                    : isBoosted
                    ? "Dengeliye Dön"
                    : "⚡ Şimdi Başlat"}
                </button>
              </div>

              {/* Yetkilendirme Bildirimi (Gerekiyorsa) */}
              {status && !status.passwordless_boost_installed && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/60 border border-white/5 text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-zinc-300" />
                    Şifresiz anlık hızlandırma için tek seferlik onay verin:
                  </span>
                  <button
                    type="button"
                    onClick={handleInstallHelper}
                    disabled={isBusy}
                    className="text-xs font-semibold text-white underline hover:text-zinc-200 cursor-pointer"
                  >
                    İzni Tanımla
                  </button>
                </div>
              )}

              {/* 2. Counter-Strike 2 E-Spor Ayarı */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Counter-Strike 2 (CS2) Ayarı
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={restartSteam}
                      onChange={(e) => setRestartSteam(e.target.checked)}
                      className="rounded bg-black border-white/20 accent-white"
                    />
                    Steam'i yeniden başlat
                  </label>
                </div>

                {/* Mod Seçimi */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCs2Mode("gamescope_stretched")}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all outline-none ${
                      cs2Mode === "gamescope_stretched"
                        ? "bg-white/10 border-white/40 text-white"
                        : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>1000x1000 Stretched</span>
                      {cs2Mode === "gamescope_stretched" && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      Önerilen E-Spor modu • Sıfır gecikme
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCs2Mode("native_max_fps")}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all outline-none ${
                      cs2Mode === "native_max_fps"
                        ? "bg-white/10 border-white/40 text-white"
                        : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Doğal (Native)</span>
                      {cs2Mode === "native_max_fps" && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      Doğrudan tam çözünürlük
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleApplyCs2}
                  disabled={isBusy}
                  className="w-full py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 outline-none"
                >
                  {isBusy ? "Uygulanıyor..." : "CS2 Ayarını Steam'e Uygula"}
                </button>
              </div>

              {/* 3. Donanım Özeti (Minimal Çubuk) */}
              {status && (
                <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500 border-t border-white/[0.06] px-1">
                  <span className="truncate max-w-[200px]" title={status.cpu_model}>
                    CPU: {status.cpu_model.split(" ")[0]} ({status.max_freq_mhz} MHz)
                  </span>
                  <span>
                    GPU: {status.dgpu_name ? "Ayrık GPU" : "Dahili"}
                  </span>
                  <span>
                    RAM: {(status.ram_available_mb / 1024).toFixed(1)} GB Boş
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
