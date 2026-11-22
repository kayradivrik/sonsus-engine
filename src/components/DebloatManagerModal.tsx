import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Trash2,
  X,
  Flame,
  CheckSquare,
  Square,
  RefreshCw,
} from "lucide-react";
import {
  CopilotLogo,
  EdgeLogo,
  XboxLogo,
  OneDriveLogo,
  BingLogo,
  CortanaLogo,
  WidgetsLogo,
  GameDvrLogo,
  TelemetryShieldLogo,
  Windows11Logo,
} from "./ui/BrandLogos";
import { tauriApi } from "../api/tauriClient";
import { DebloatItem } from "../types/game";

interface DebloatManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (title: string, message: string) => void;
}

export const DebloatManagerModal: React.FC<DebloatManagerModalProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const [items, setItems] = useState<DebloatItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

  const loadItems = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const data = await tauriApi.getDebloatItems();
      setItems(data);
      // Varsayılan olarak henüz uygulanmamış olanları otomatik seç
      const initialSelected = new Set(
        data.filter((i) => !i.is_applied).map((i) => i.id)
      );
      setSelectedIds(initialSelected);
    } catch (e) {
      console.error("Debloat listesi yüklenemedi:", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleApplyDebloat = async () => {
    if (selectedIds.size === 0) return;
    setIsApplying(true);
    setStatusMessage(null);
    try {
      const res = await tauriApi.applyDebloatItems(Array.from(selectedIds));
      setStatusMessage(res.message);
      if (onNotify) {
        onNotify("Windows 11 Debloat Tamamlandı", res.message);
      }
      await loadItems();
    } catch (e: any) {
      setStatusMessage(`Hata: ${e?.message || e}`);
    } finally {
      setIsApplying(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterCategory === "all") return true;
    return item.category === filterCategory;
  });

  const allFilteredSelected =
    filteredItems.length > 0 && selectedIds.size === filteredItems.length;

  const getItemVisual = (iconKey: string) => {
    switch (iconKey) {
      case "telemetry":
        return {
          icon: <TelemetryShieldLogo size={30} />,
          bg: "bg-red-950/50 border-red-500/30",
          tag: "Telemetri",
        };
      case "copilot":
        return {
          icon: <CopilotLogo size={30} />,
          bg: "bg-purple-950/50 border-purple-500/30",
          tag: "Copilot AI",
        };
      case "bing":
        return {
          icon: <BingLogo size={30} />,
          bg: "bg-blue-950/50 border-blue-500/30",
          tag: "Bing Arama",
        };
      case "cortana":
        return {
          icon: <CortanaLogo size={30} />,
          bg: "bg-cyan-950/50 border-cyan-500/30",
          tag: "Cortana",
        };
      case "edge":
        return {
          icon: <EdgeLogo size={30} />,
          bg: "bg-teal-950/50 border-teal-500/30",
          tag: "Edge Servisi",
        };
      case "gamedvr":
        return {
          icon: <GameDvrLogo size={30} />,
          bg: "bg-emerald-950/50 border-emerald-500/30",
          tag: "Game DVR",
        };
      case "widgets":
        return {
          icon: <WidgetsLogo size={30} />,
          bg: "bg-amber-950/50 border-amber-500/30",
          tag: "Widget'lar",
        };
      case "xbox":
        return {
          icon: <XboxLogo size={30} />,
          bg: "bg-green-950/50 border-green-500/30",
          tag: "Xbox Live",
        };
      case "onedrive":
        return {
          icon: <OneDriveLogo size={30} />,
          bg: "bg-sky-950/50 border-sky-500/30",
          tag: "OneDrive",
        };
      case "diagnostics":
      default:
        return {
          icon: <Windows11Logo size={30} />,
          bg: "bg-blue-950/50 border-blue-500/30",
          tag: "Windows 11",
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Üst Başlık & Termal Güvenlik Rozeti */}
        <div className="px-6 py-5 border-b border-zinc-800/80 flex items-start justify-between bg-zinc-900/50">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Windows 11 Debloat & Telemetri Temizleyicisi
                  <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                    v1.0 Windows 11
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Arka plandaki telemetri, Bing araması, Edge başlangıç servisleri ve Game DVR gecikmelerini temizleyin.
                </p>
              </div>
            </div>

            {/* HP Victus Termal Koruma Bildirimi */}
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center gap-2.5 text-xs text-amber-300">
              <Flame className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>HP Victus & i5-13500H Termal Koruma:</strong> İşlemciyi 95°C+ sıcaklığa zorlayan kontrolsüz Nihai Performans yerine, donanımı serin ve stabil tutan güvenli Yüksek Performans güç profili önerilir.
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtre ve Toplu Seçim Çubuğu */}
        <div className="px-6 py-3 border-b border-zinc-800/60 bg-zinc-900/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: "all", label: "Tümü" },
              { id: "privacy", label: "Gizlilik & Telemetri" },
              { id: "gaming", label: "Oyun & Gecikme" },
              { id: "services", label: "Servisler" },
              { id: "apps", label: "Gereksiz Uygulamalar" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterCategory === cat.id
                    ? "bg-white text-black font-semibold shadow"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 transition-colors"
            >
              {allFilteredSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>Seçimi Kaldır</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-zinc-400" />
                  <span>Hepsini Seç ({filteredItems.length})</span>
                </>
              )}
            </button>

            <button
              onClick={loadItems}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/60 transition-colors"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Debloat Kartları Izgarası */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="py-16 text-center text-zinc-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-zinc-400" />
              Windows 11 bileşenleri taranıyor...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">
              Bu kategoride debloat bileşeni bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredItems.map((item) => {
                const visual = getItemVisual(item.icon_key);
                const isSelected = selectedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                      isSelected
                        ? "bg-zinc-900/90 border-zinc-600 shadow-lg"
                        : "bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40"
                    }`}
                  >
                    {/* Görsel Logo / Simge Kutusu */}
                    <div
                      className={`p-3 rounded-xl border shrink-0 flex items-center justify-center ${visual.bg}`}
                    >
                      {visual.icon}
                    </div>

                    {/* Bilgi Alanı */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white tracking-tight truncate">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-2 mt-2.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                          {visual.tag}
                        </span>

                        {item.is_applied ? (
                          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">
                            <CheckCircle2 className="w-3 h-3" /> Optimize Edildi
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-800/30">
                            Aktif (Debloat Edilebilir)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Checkbox Seçim Kutusu */}
                    <div className="absolute top-4 right-4">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alt Aksiyon Çubuğu */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-400">
            {statusMessage ? (
              <span className="text-emerald-400 font-medium">{statusMessage}</span>
            ) : (
              <span>
                <strong>{selectedIds.size}</strong> öğe seçildi.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 transition-colors"
            >
              Kapat
            </button>

            <button
              onClick={handleApplyDebloat}
              disabled={isApplying || selectedIds.size === 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedIds.size > 0 && !isApplying
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Debloat Uygulanıyor...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Seçili ({selectedIds.size}) Öğeyi Toplu Debloat Et</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
