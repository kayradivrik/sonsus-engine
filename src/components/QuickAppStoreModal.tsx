import React, { useEffect, useState } from "react";
import {
  Download,
  CheckCircle2,
  X,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  Loader2,
  Package,
} from "lucide-react";
import {
  SteamLogo,
  DiscordLogo,
  EpicGamesLogo,
  EaAppLogo,
  BattleNetLogo,
  NvidiaLogo,
  MsiAfterburnerLogo,
  CpuZLogo,
  GpuZLogo,
  ObsLogo,
  SevenZipLogo,
  DirectXLogo,
  VcRedistLogo,
  TeamSpeakLogo,
  Windows11Logo,
} from "./ui/BrandLogos";
import { tauriApi } from "../api/tauriClient";
import { QuickAppItem } from "../types/game";

interface QuickAppStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (title: string, message: string) => void;
}

export const QuickAppStoreModal: React.FC<QuickAppStoreModalProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const [apps, setApps] = useState<QuickAppItem[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(new Set());
  const [installingPackageId, setInstallingPackageId] = useState<string | null>(null);
  const [isBatchInstalling, setIsBatchInstalling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadApps();
    }
  }, [isOpen]);

  const loadApps = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const data = await tauriApi.getQuickApps();
      setApps(data);
    } catch (e) {
      console.error("Uygulama listesi alınamadı:", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleSelect = (pkgId: string) => {
    const next = new Set(selectedPackageIds);
    if (next.has(pkgId)) {
      next.delete(pkgId);
    } else {
      next.add(pkgId);
    }
    setSelectedPackageIds(next);
  };

  const filteredApps = apps.filter((app) => {
    const matchesCategory =
      activeCategory === "all" || app.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const uninstalledFiltered = filteredApps.filter((a) => !a.is_installed);
  const allFilteredSelected =
    uninstalledFiltered.length > 0 &&
    uninstalledFiltered.every((a) => selectedPackageIds.has(a.package_id));

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedPackageIds(new Set());
    } else {
      setSelectedPackageIds(new Set(uninstalledFiltered.map((a) => a.package_id)));
    }
  };

  const handleInstallSingle = async (app: QuickAppItem) => {
    if (app.is_installed || installingPackageId) return;
    setInstallingPackageId(app.package_id);
    setStatusMessage(`${app.name} winget üzerinden indiriliyor ve kuruluyor...`);
    try {
      const msg = await tauriApi.installQuickApp(app.package_id);
      setStatusMessage(msg);
      if (onNotify) {
        onNotify("Kurulum Tamamlandı", `${app.name} başarıyla kuruldu.`);
      }
      await loadApps();
    } catch (e: any) {
      setStatusMessage(`Hata: ${e?.message || e}`);
    } finally {
      setInstallingPackageId(null);
    }
  };

  const handleInstallBatch = async () => {
    if (selectedPackageIds.size === 0 || isBatchInstalling) return;
    setIsBatchInstalling(true);
    setStatusMessage(
      `Seçilen ${selectedPackageIds.size} uygulama sırayla kuruluyor...`
    );
    try {
      const results = await tauriApi.installBatchQuickApps(
        Array.from(selectedPackageIds)
      );
      setStatusMessage(`Kurulum tamamlandı (${results.length} paket).`);
      if (onNotify) {
        onNotify(
          "Toplu Kurulum Bitti",
          `${results.length} adet oyun aracı kuruldu.`
        );
      }
      setSelectedPackageIds(new Set());
      await loadApps();
    } catch (e: any) {
      setStatusMessage(`Hata: ${e?.message || e}`);
    } finally {
      setIsBatchInstalling(false);
    }
  };

  const getAppVisual = (iconKey: string) => {
    switch (iconKey) {
      case "steam":
        return { icon: <SteamLogo size={32} />, border: "border-sky-500/30", bg: "bg-sky-950/30" };
      case "discord":
        return { icon: <DiscordLogo size={32} />, border: "border-indigo-500/30", bg: "bg-indigo-950/30" };
      case "epic":
        return { icon: <EpicGamesLogo size={32} />, border: "border-zinc-500/30", bg: "bg-zinc-900/40" };
      case "ea":
        return { icon: <EaAppLogo size={32} />, border: "border-red-500/30", bg: "bg-red-950/30" };
      case "battlenet":
        return { icon: <BattleNetLogo size={32} />, border: "border-cyan-500/30", bg: "bg-cyan-950/30" };
      case "nvidia":
        return { icon: <NvidiaLogo size={32} />, border: "border-lime-500/30", bg: "bg-lime-950/30" };
      case "msi":
        return { icon: <MsiAfterburnerLogo size={32} />, border: "border-red-600/30", bg: "bg-red-950/30" };
      case "cpuz":
        return { icon: <CpuZLogo size={32} />, border: "border-sky-600/30", bg: "bg-sky-950/30" };
      case "gpuz":
        return { icon: <GpuZLogo size={32} />, border: "border-emerald-600/30", bg: "bg-emerald-950/30" };
      case "obs":
        return { icon: <ObsLogo size={32} />, border: "border-zinc-400/30", bg: "bg-zinc-800/30" };
      case "sevenzip":
        return { icon: <SevenZipLogo size={32} />, border: "border-zinc-400/30", bg: "bg-zinc-800/30" };
      case "directx":
        return { icon: <DirectXLogo size={32} />, border: "border-blue-600/30", bg: "bg-blue-950/30" };
      case "vcredist":
        return { icon: <VcRedistLogo size={32} />, border: "border-purple-600/30", bg: "bg-purple-950/30" };
      case "teamspeak":
        return { icon: <TeamSpeakLogo size={32} />, border: "border-blue-500/30", bg: "bg-blue-950/30" };
      default:
        return { icon: <Windows11Logo size={32} />, border: "border-blue-500/30", bg: "bg-blue-950/30" };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        
        {/* Üst Başlık & Kapatma */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Hızlı Uygulama & Oyun Araçları Deposu
                </h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Winget 1-Click
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Steam, Epic, EA, Discord, RTX 4050 sürücüleri ve DirectX gibi temel araçları tek tıkla kurun.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Durum / Bildirim Barı */}
        {statusMessage && (
          <div className="px-6 py-2.5 bg-cyan-950/40 border-b border-cyan-800/40 text-xs text-cyan-200 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-cyan-400" />
            <span className="font-medium">{statusMessage}</span>
          </div>
        )}

        {/* Arama & Kategori & Hepsini Seç Barı */}
        <div className="px-6 py-3.5 border-b border-zinc-800/60 bg-zinc-900/20 flex flex-wrap items-center justify-between gap-3">
          
          {/* Arama Kutusu */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Uygulama veya araç ara..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Kategori Filtre Butonları */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {[
              { id: "all", label: "Tümü" },
              { id: "launchers", label: "Başlatıcılar" },
              { id: "voice", label: "İletişim & Ses" },
              { id: "hardware", label: "Donanım & GPU" },
              { id: "tools", label: "Araçlar" },
              { id: "runtimes", label: "Runtimes" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === cat.id
                    ? "bg-white text-black shadow font-semibold"
                    : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Hepsini Seç & Yenile */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              disabled={uninstalledFiltered.length === 0}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white border border-zinc-800 transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              {allFilteredSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Seçimi Bırak</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Kurulmayanları Seç ({uninstalledFiltered.length})</span>
                </>
              )}
            </button>

            <button
              onClick={loadApps}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
              title="Yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Uygulama Kartları Izgarası */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isLoading ? (
            <div className="py-20 text-center text-zinc-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-zinc-400" />
              Yüklü uygulamalar kontrol ediliyor...
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">
              Aradığınız kriterde uygulama bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredApps.map((app) => {
                const visual = getAppVisual(app.icon_key);
                const isSelected = selectedPackageIds.has(app.package_id);
                const isCurrentlyInstalling = installingPackageId === app.package_id;

                return (
                  <div
                    key={app.id}
                    className={`relative p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                      isSelected
                        ? "bg-zinc-900/90 border-cyan-500/50 shadow-lg"
                        : "bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40"
                    }`}
                  >
                    {/* Marka Logosu */}
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 flex items-center justify-center ${visual.bg} ${visual.border}`}
                    >
                      {visual.icon}
                    </div>

                    {/* Bilgi Alanı */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white tracking-tight truncate">
                          {app.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {app.size_estimate}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                        {app.description}
                      </p>

                      <div className="flex items-center gap-2 mt-3">
                        {app.is_installed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Sistemde Yüklü
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleInstallSingle(app)}
                              disabled={isCurrentlyInstalling || isBatchInstalling}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black shadow transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isCurrentlyInstalling ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Yükleniyor...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" />
                                  <span>İndir & Kur</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => toggleSelect(app.package_id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                              title="Toplu kuruluma ekle/kaldır"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-cyan-400" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-500" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alt Çubuk (Toplu Kurulum Butonu) */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            {selectedPackageIds.size > 0 ? (
              <span className="text-cyan-300 font-medium">
                {selectedPackageIds.size} uygulama seçildi (sessiz winget kurulumu yapılacak)
              </span>
            ) : (
              <span>Toplu kurmak istediğiniz araçları işaretleyin.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
            >
              Kapat
            </button>

            <button
              onClick={handleInstallBatch}
              disabled={selectedPackageIds.size === 0 || isBatchInstalling}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {isBatchInstalling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Toplu Yükleniyor...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Seçilenleri Kur ({selectedPackageIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
