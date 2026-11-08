import React, { useState, useEffect } from "react";
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

  // CS2 Preset formu: Varsayılan olarak 1000x1000 Stretched modunda gelsin
  const [cs2Mode, setCs2Mode] = useState<"native_max_fps" | "gamescope_stretched">("gamescope_stretched");
  const [internalW, setInternalW] = useState(1000);
  const [internalH, setInternalH] = useState(1000);
  const [refreshHz, setRefreshHz] = useState(180);
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

  const handleInstallHelper = async () => {
    setIsBusy(true);
    setActionMsg("Kullanıcı yetkisi (Polkit / pkexec) bekleniyor...");
    try {
      const res = await tauriApi.installBoostHelper();
      setActionMsg(res);
      await loadStatus();
    } catch (e: any) {
      setActionMsg(`Kurulum hatası: ${e}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleTriggerBoostNow = async () => {
    setIsBusy(true);
    try {
      const res = await tauriApi.triggerExtremeBoostNow();
      setActionMsg(res);
      await loadStatus();
    } catch (e: any) {
      setActionMsg(`Hata: ${e}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleStopBoostNow = async () => {
    setIsBusy(true);
    try {
      const res = await tauriApi.stopExtremeBoostNow();
      setActionMsg(res);
      await loadStatus();
    } catch (e: any) {
      setActionMsg(`Hata: ${e}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleApplyCs2Preset = async () => {
    setIsBusy(true);
    setActionMsg("Steam LaunchOptions yapılandırması güncelleniyor...");
    try {
      const payload: SteamEsportsPresetPayload = {
        appid: "730",
        mode: cs2Mode,
        internal_w: cs2Mode === "gamescope_stretched" ? internalW : undefined,
        internal_h: cs2Mode === "gamescope_stretched" ? internalH : undefined,
        output_w: 1920,
        output_h: 1080,
        refresh_hz: refreshHz,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0b0b0f] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-white" />
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                E-Spor & CS2 Ultra FPS Motoru
                <span className="text-xs font-normal text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                  Çekirdek Optimizasyonu
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Linux çekirdeğini ve donanımı son limitine kadar oyuna odaklar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {actionMsg && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-zinc-200 flex items-center justify-between">
              <span>{actionMsg}</span>
              <button
                onClick={() => setActionMsg(null)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-white/40 text-sm">
              Donanım ve çekirdek telemetrisi okunuyor...
            </div>
          ) : status ? (
            <>
              {/* Telemetry Bento Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">İşlemci & Çekirdek</div>
                  <div className="text-sm font-semibold text-white mt-1 truncate">{status.cpu_model}</div>
                  <div className="text-xs text-zinc-300 mt-1 font-mono">
                    P-Core: {status.p_core_range || "Tümü"} (E-Core: {status.e_core_range || "Yok"})
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Turbo Boost Frekansı</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-bold text-white">
                      {status.turbo_enabled ? `${status.max_freq_mhz} MHz` : "2600 MHz (Kilitli)"}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                        status.turbo_enabled
                          ? "bg-white/10 text-white border-white/20"
                          : "bg-zinc-800 text-zinc-400 border-white/10"
                      }`}
                    >
                      {status.turbo_enabled ? "Açık" : "Kapalı"}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 mt-1 capitalize">Vali: {status.current_governor}</div>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Grafik Kartı (dGPU)</div>
                  <div className="text-sm font-semibold text-white mt-1 truncate">
                    {status.dgpu_name || "Dahili Intel GPU"}
                  </div>
                  <div className="text-xs text-zinc-300 mt-1">
                    {status.has_hybrid_gpu ? "Hibrit Laptop (Iris Xe + RTX)" : "Ayrık GPU"}
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">RAM & Takas (Swap)</div>
                  <div className="text-sm font-semibold text-white mt-1">
                    {status.ram_available_mb} / {status.ram_total_mb} MB Boş
                  </div>
                  <div className="text-xs mt-1 text-white/40">
                    Swap: {status.swap_used_mb} MB aktif
                  </div>
                </div>
              </div>

              {/* Darboğaz Uyarıları */}
              {status.bottlenecks.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                    Tespit Edilen Performans Darboğazları ({status.bottlenecks.length})
                  </div>
                  <div className="grid gap-2">
                    {status.bottlenecks.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-xl border border-white/10 bg-zinc-900/60 text-xs flex items-start gap-3"
                      >
                        <span className="text-sm mt-0.5 text-zinc-300">
                          {b.severity === "critical" ? "●" : "○"}
                        </span>
                        <div>
                          <div className="font-semibold text-white">{b.title}</div>
                          <div className="text-zinc-400 mt-0.5 leading-relaxed">{b.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hızlı Eylemler (Boost Tuşları) */}
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Anlık Sistem Hızlandırma & Çekirdek Kilidi</h3>
                    <p className="text-xs text-white/40">
                      İşlemci frekansını 4.7 GHz'e kilitler, arka plan tarayıcılarını dondurur ve RAM önbelleğini temizler
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!status.passwordless_boost_installed ? (
                      <button
                        onClick={handleInstallHelper}
                        disabled={isBusy}
                        className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-xl border border-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Şifresiz Boost Kur (pkexec)
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-300 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                        ✓ Şifresiz Servis Aktif
                      </span>
                    )}

                    <button
                      onClick={handleTriggerBoostNow}
                      disabled={isBusy}
                      className="px-4 py-1.5 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      Şimdi Ateşle
                    </button>

                    <button
                      onClick={handleStopBoostNow}
                      disabled={isBusy}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Dengeliye Dön
                    </button>
                  </div>
                </div>
              </div>

              {/* CS2 Özel Enjeksiyon Modülü */}
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Counter-Strike 2 (CS2) Özel E-Spor Başlatma Kancası
                    </h3>
                    <p className="text-xs text-white/40">
                      Steam LaunchOptions'a doğrudan RTX 4050 Prime Offload + P-Core Kilidi + Vulkan gecikme ayarlarını yazar
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3 pt-2">
                  <div
                    onClick={() => setCs2Mode("native_max_fps")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      cs2Mode === "native_max_fps"
                        ? "bg-white/10 border-white/40 shadow-sm"
                        : "bg-white/[0.02] border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">1. Saf Maksimum FPS (Native)</span>
                      {cs2Mode === "native_max_fps" && <span className="text-white text-xs font-medium">✓ Seçili</span>}
                    </div>
                    <p className="text-[11px] text-white/50 mt-1">
                      Gamescope katmanı olmadan doğrudan ekran kartına bağlanır. En yüksek saf FPS ve sıfır ek girdi gecikmesi.
                    </p>
                  </div>

                  <div
                    onClick={() => setCs2Mode("gamescope_stretched")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      cs2Mode === "gamescope_stretched"
                        ? "bg-white/10 border-white/40 shadow-sm"
                        : "bg-white/[0.02] border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">2. Gamescope Stretched (1000x1000)</span>
                      {cs2Mode === "gamescope_stretched" && <span className="text-white text-xs font-medium">✓ Seçili</span>}
                    </div>
                    <p className="text-[11px] text-white/50 mt-1">
                      Mevcut stretched çözünürlüğünüzü RTX 4050 donanım hızlandırması ve yırtılmasız sıfır gecikme moduyla çalıştırır.
                    </p>
                  </div>
                </div>

                {cs2Mode === "gamescope_stretched" && (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <div>
                      <label className="text-[10px] text-white/40 block mb-1">İç Genişlik (px)</label>
                      <input
                        type="number"
                        value={internalW}
                        onChange={(e) => setInternalW(Number(e.target.value))}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 block mb-1">İç Yükseklik (px)</label>
                      <input
                        type="number"
                        value={internalH}
                        onChange={(e) => setInternalH(Number(e.target.value))}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 block mb-1">Yenileme Hızı (Hz)</label>
                      <input
                        type="number"
                        value={refreshHz}
                        onChange={(e) => setRefreshHz(Number(e.target.value))}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restartSteam}
                      onChange={(e) => setRestartSteam(e.target.checked)}
                      className="rounded bg-black/50 border-white/20 accent-white"
                    />
                    Uygulandıktan sonra ayarların geçerli olması için Steam'i yeniden başlat
                  </label>

                  <button
                    onClick={handleApplyCs2Preset}
                    disabled={isBusy}
                    className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    CS2 Kancasını Steam'e Yaz
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
