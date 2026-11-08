import React, { useState, useEffect } from "react";
import { X, Check, SlidersHorizontal, Loader2 } from "lucide-react";
import { UltraPerfStatus, SteamEsportsPresetPayload } from "../types/game";
import { tauriApi } from "../api/tauriClient";

interface UltraFpsModalProps {
  onClose: () => void;
}

export const UltraFpsModal: React.FC<UltraFpsModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<UltraPerfStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const [cs2Mode, setCs2Mode] = useState<"gamescope_stretched" | "native_max_fps">(
    "gamescope_stretched"
  );
  const [restartSteam, setRestartSteam] = useState(true);
  const [appliedCs2, setAppliedCs2] = useState(false);

  const loadStatus = async () => {
    try {
      const data = await tauriApi.getUltraPerfStatus();
      setStatus(data);
    } catch (e: any) {
      setFeedback(`Hata: ${e}`);
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
    setFeedback(null);
    try {
      if (isBoosted) {
        await tauriApi.stopExtremeBoostNow();
        setFeedback("Dengeli moda dönüldü.");
      } else {
        await tauriApi.triggerExtremeBoostNow();
        setFeedback("Performans modu etkinleştirildi.");
      }
      await loadStatus();
    } catch (e: any) {
      setFeedback(`İşlem başarısız: ${e}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleApplyCs2 = async () => {
    setIsBusy(true);
    setFeedback(null);
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
      await tauriApi.applySteamEsportsPreset(payload);
      setAppliedCs2(true);
      setFeedback("CS2 başlatma parametreleri güncellendi.");
      setTimeout(() => setAppliedCs2(false), 3000);
      await loadStatus();
    } catch (e: any) {
      setFeedback(`Hata: ${e}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleInstallHelper = async () => {
    setIsBusy(true);
    try {
      await tauriApi.installBoostHelper();
      setFeedback("Yetkilendirme tamamlandı.");
      await loadStatus();
    } catch (e: any) {
      setFeedback(`Yetki hatası: ${e}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#101014] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in text-zinc-200">
        {/* Üst Başlık */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Performans & CS2
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Gövde */}
        <div className="p-5 space-y-4">
          {feedback && (
            <div className="text-xs px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-between">
              <span>{feedback}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-zinc-500 hover:text-zinc-300 ml-2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sistem durumu kontrol ediliyor...</span>
            </div>
          ) : (
            <>
              {/* Row 1: Performans Modu Switch */}
              <div className="flex items-center justify-between py-1">
                <div className="pr-4">
                  <div className="text-xs font-semibold text-white">
                    Performans Profili
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-normal">
                    CPU'yu tepe saat hızına kilitler, arka plan önceliğini düşürür.
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isBoosted}
                  onClick={handleToggleBoost}
                  disabled={isBusy}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isBoosted ? "bg-white" : "bg-zinc-800"
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${isBoosted ? "translate-x-5 bg-black" : "translate-x-0 bg-zinc-400"
                      }`}
                  />
                </button>
              </div>

              {/* Şifresiz yetki bildirimi (Sadece gerekirse tek satır) */}
              {status && !status.passwordless_boost_installed && (
                <div className="flex items-center justify-between text-[11px] px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/80 text-zinc-400">
                  <span>Şifresiz geçiş izni gerekli:</span>
                  <button
                    type="button"
                    onClick={handleInstallHelper}
                    disabled={isBusy}
                    className="text-zinc-200 hover:text-white underline font-medium cursor-pointer"
                  >
                    İzin ver
                  </button>
                </div>
              )}

              <div className="border-t border-zinc-800/80" />

              {/* Row 2: Counter-Strike 2 Ayarı */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Counter-Strike 2 Çözünürlüğü
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Steam Launch
                  </span>
                </div>

                {/* Segmented Kontrol */}
                <div className="grid grid-cols-2 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setCs2Mode("gamescope_stretched")}
                    className={`py-1.5 px-2 rounded-md font-medium transition-all text-center cursor-pointer ${cs2Mode === "gamescope_stretched"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                      }`}
                  >
                    1000×1000 Stretched
                  </button>
                  <button
                    type="button"
                    onClick={() => setCs2Mode("native_max_fps")}
                    className={`py-1.5 px-2 rounded-md font-medium transition-all text-center cursor-pointer ${cs2Mode === "native_max_fps"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                      }`}
                  >
                    Varsayılan (1080p)
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={restartSteam}
                      onChange={(e) => setRestartSteam(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700 accent-white w-3.5 h-3.5"
                    />
                    Steam'i yeniden başlat
                  </label>

                  <button
                    type="button"
                    onClick={handleApplyCs2}
                    disabled={isBusy}
                    className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {appliedCs2 ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Kaydedildi</span>
                      </>
                    ) : (
                      <span>Uygula</span>
                    )}
                  </button>
                </div>
              </div>

              <div className="border-t border-zinc-800/80" />

              {/* Row 3: Sistem Donanım Bilgisi */}
              {status && (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-zinc-500">İşlemci</span>
                    <span
                      className="text-zinc-300 font-mono truncate max-w-[220px]"
                      title={status.cpu_model}
                    >
                      {status.cpu_model}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-zinc-500">Grafik</span>
                    <span className="text-zinc-300">
                      {status.dgpu_name || "Entegre GPU"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-zinc-500">Bellek</span>
                    <span className="text-zinc-300">
                      {(status.ram_available_mb / 1024).toFixed(1)} GB kullanılabilir
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
