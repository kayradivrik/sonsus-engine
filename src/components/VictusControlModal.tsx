import React, { useState, useEffect } from "react";
import { Gauge, Cpu, Fan, BatteryCharging, Zap, Shield, RefreshCw, X, Laptop } from "lucide-react";
import { tauriApi } from "../api/tauriClient";
import { HardwareThermalStatus } from "../types/game";

interface VictusControlModalProps {
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const VictusControlModal: React.FC<VictusControlModalProps> = ({
  onClose,
  showToast,
}) => {
  const [status, setStatus] = useState<HardwareThermalStatus | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const res = await tauriApi.getHardwareThermalStatus();
      setStatus(res);
    } catch (e) {
      console.error("Donanım durumu okunamadı:", e);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleSelectProfile = async (profileKey: string) => {
    setUpdatingProfile(profileKey);
    try {
      const msg = await tauriApi.setHardwareThermalProfile(profileKey);
      showToast(msg);
      await loadStatus();
    } catch (e) {
      showToast(`Profil değiştirilemedi: ${e}`);
    } finally {
      setUpdatingProfile(null);
    }
  };

  const PROFILES = [
    {
      key: "performance",
      label: "Performans Modu",
      subtext: "Maksimum CPU gücü, agresif fan eğrisi ve e-spor için en yüksek FPS.",
      icon: Zap,
      activeColor: "bg-white text-black font-bold",
    },
    {
      key: "balanced",
      label: "Dengeli Mod",
      subtext: "Günlük kullanım ve orta yükte oyunlar için dinamik frekans ve optimize fan.",
      icon: Gauge,
      activeColor: "bg-white text-black font-bold",
    },
    {
      key: "power-saver",
      label: "Sessiz / Tasarruf Modu",
      subtext: "Düşük güç tüketimi, fısıltı kadar sessiz fanlar ve uzatılmış pil ömrü.",
      icon: Shield,
      activeColor: "bg-white text-black font-bold",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Üst Başlık */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Laptop className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  HP Victus Donanım & Fan Kontrolü
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                  HP-WMI Live
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Canlı CPU sıcaklığı, çift fan devir hızı (RPM) ve termal güç profilleri
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Göstergeler (Sensörler) */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* CPU Sıcaklığı */}
            <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-4 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mb-2">
                <Cpu className="w-4 h-4 text-zinc-300" />
                <span>CPU Isısı</span>
              </div>
              <div className="text-2xl font-black text-white tabular-nums">
                {status?.cpu_temp_celsius != null ? `${status.cpu_temp_celsius}°C` : "—"}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">Package Core</div>
            </div>

            {/* Fan 1 (CPU) */}
            <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-4 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mb-2">
                <Fan className={`w-4 h-4 text-zinc-300 ${(status?.fans[0]?.rpm ?? 0) > 0 ? "animate-spin" : ""}`} />
                <span>CPU Fanı</span>
              </div>
              <div className="text-2xl font-black text-white tabular-nums">
                {status?.fans[0]?.rpm ?? 0}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">RPM Devir</div>
            </div>

            {/* Fan 2 (GPU) */}
            <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-4 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mb-2">
                <Fan className={`w-4 h-4 text-zinc-300 ${(status?.fans[1]?.rpm ?? 0) > 0 ? "animate-spin" : ""}`} />
                <span>GPU Fanı</span>
              </div>
              <div className="text-2xl font-black text-white tabular-nums">
                {status?.fans[1]?.rpm ?? 0}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">RPM Devir</div>
            </div>

            {/* Batarya Güç Çekimi */}
            <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-4 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mb-2">
                <BatteryCharging className="w-4 h-4 text-zinc-300" />
                <span>Güç Tüketimi</span>
              </div>
              <div className="text-2xl font-black text-white tabular-nums">
                {status?.battery_watts != null ? `${status.battery_watts}W` : "Adaptörde"}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">Anlık Değer</div>
            </div>
          </div>

          {/* Güç ve Fan Profili Seçimi */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
              <span>Termal Güç Profili</span>
              {updatingProfile && (
                <span className="text-zinc-400 flex items-center gap-1 text-[11px] normal-case">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Uygulanıyor...
                </span>
              )}
            </div>

            <div className="space-y-2">
              {PROFILES.map((p) => {
                const IconComponent = p.icon;
                const isActive =
                  status?.active_profile === p.key ||
                  (p.key === "power-saver" && status?.active_profile === "quiet") ||
                  (p.key === "power-saver" && status?.active_profile === "cool");

                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleSelectProfile(p.key)}
                    disabled={Boolean(updatingProfile)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                      isActive
                        ? "bg-zinc-900/90 border-white/40 shadow-lg"
                        : "bg-zinc-900/30 hover:bg-zinc-900/60 border-white/5 hover:border-white/15"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isActive
                          ? "bg-white text-black border-white"
                          : "bg-zinc-800 text-zinc-400 border-white/10"
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-white">
                          {p.label}
                        </span>
                        {isActive && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-black">
                            Aktif Profil
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 leading-snug">
                        {p.subtext}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alt Bilgi */}
        <div className="p-4 bg-zinc-950 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500">
          <span>HP ACPI ve Intel P-State üzerinden doğrudan kontrol edilir.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
