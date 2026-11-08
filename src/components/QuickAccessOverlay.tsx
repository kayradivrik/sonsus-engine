import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  Volume2,
  VolumeX,
  Gauge,
  Sparkles,
  Zap,
} from "lucide-react";
import { tauriApi } from "../api/tauriClient";

interface QuickAccessOverlayProps {
  open: boolean;
  onClose: () => void;
  runningGameTitle?: string | null;
}

export const QuickAccessOverlay: React.FC<QuickAccessOverlayProps> = ({
  open,
  onClose,
  runningGameTitle,
}) => {
  const [mangoHud, setMangoHud] = useState(true);
  const [fsrSharpness, setFsrSharpness] = useState(2);
  const [backgroundMuted, setBackgroundMuted] = useState(false);
  const [extremeBoost, setExtremeBoost] = useState(false);

  useEffect(() => {
    if (!open) return;
    tauriApi.getUltraPerfStatus().then((s) => {
      setExtremeBoost(s.current_governor === "performance");
    }).catch(() => {});
  }, [open]);

  const toggleBoost = async () => {
    try {
      if (extremeBoost) {
        await tauriApi.stopExtremeBoostNow();
        setExtremeBoost(false);
      } else {
        await tauriApi.triggerExtremeBoostNow();
        setExtremeBoost(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div className="w-80 h-full bg-[#0c0c11]/95 border-l border-white/12 shadow-2xl flex flex-col justify-between p-5 text-zinc-200 select-none animate-in slide-in-from-right duration-200">
        <div className="space-y-5">
          {/* Üst Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zinc-300" />
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                  Hızlı Erişim
                </h3>
                {runningGameTitle && (
                  <div className="text-[10px] text-zinc-400 truncate max-w-[170px]">
                    {runningGameTitle}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Performans Modu */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-xs font-semibold text-white">Performans Profili</span>
              </div>
              <button
                type="button"
                onClick={toggleBoost}
                className={`h-5 w-9 rounded-full transition-colors relative cursor-pointer ${
                  extremeBoost ? "bg-white" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full transition-transform transform ${
                    extremeBoost ? "translate-x-4 bg-black" : "translate-x-0.5 bg-zinc-400"
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              CPU'yu tepe saat hızına sabitler ve arka planı kısıtlar.
            </p>
          </div>

          {/* MangoHud FPS Katmanı */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-xs font-semibold text-white">MangoHud FPS & Telemetri</span>
              </div>
              <button
                type="button"
                onClick={() => setMangoHud(!mangoHud)}
                className={`h-5 w-9 rounded-full transition-colors relative cursor-pointer ${
                  mangoHud ? "bg-white" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full transition-transform transform ${
                    mangoHud ? "translate-x-4 bg-black" : "translate-x-0.5 bg-zinc-400"
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Ekran köşesinde FPS, CPU sıcaklığı ve VRAM kullanımını gösterir.
            </p>
          </div>

          {/* Gamescope FSR Keskinleştirme */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-xs font-semibold text-white">FSR Keskinleştirme</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">{fsrSharpness} / 5</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={fsrSharpness}
              onChange={(e) => setFsrSharpness(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* Arka Plan Ses Kısma */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              {backgroundMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
              )}
              <div>
                <div className="text-xs font-semibold text-white">Arka Planı Sessize Al</div>
                <div className="text-[10px] text-zinc-500">Tarayıcı ve arka plan sesleri</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBackgroundMuted(!backgroundMuted)}
              className={`h-5 w-9 rounded-full transition-colors relative cursor-pointer ${
                backgroundMuted ? "bg-white" : "bg-zinc-800"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform transform ${
                  backgroundMuted ? "translate-x-4 bg-black" : "translate-x-0.5 bg-zinc-400"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Alt Bilgi */}
        <div className="pt-3 border-t border-white/[0.08] text-[10px] text-zinc-500 flex items-center justify-between font-mono">
          <span>Shift + F12 ile kapat</span>
          <span>Steam Deck Modu</span>
        </div>
      </div>
    </div>
  );
};

