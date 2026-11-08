import React, { useState, useEffect } from "react";
import { HardDrive, Trash2, RefreshCw, X, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { tauriApi } from "../api/tauriClient";
import { CleanableCategory, StorageAnalysisResult, formatBytes } from "../types/game";

interface StorageCleanerModalProps {
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const StorageCleanerModal: React.FC<StorageCleanerModalProps> = ({
  onClose,
  showToast,
}) => {
  const [data, setData] = useState<StorageAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaningId, setCleaningId] = useState<string | null>(null);
  const [cleanedIds, setCleanedIds] = useState<Set<string>>(new Set());

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const res = await tauriApi.analyzeDiskStorage();
      setData(res);
    } catch (e) {
      showToast(`Disk analizi başarısız: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, []);

  const handleCleanItem = async (cat: CleanableCategory) => {
    setCleaningId(cat.id);
    try {
      const freedBytes = await tauriApi.cleanStorageItem(cat.id);
      showToast(`${cat.title} temizlendi! ${formatBytes(freedBytes)} yer açıldı.`);
      setCleanedIds((prev) => new Set(prev).add(cat.id));
      setData((prev) => {
        if (!prev) return null;
        return {
          total_reclaimable_bytes: Math.max(0, prev.total_reclaimable_bytes - cat.size_bytes),
          categories: prev.categories.map((c) =>
            c.id === cat.id ? { ...c, size_bytes: 0, item_count: 0 } : c
          ),
        };
      });
    } catch (e) {
      showToast(`Temizleme hatası: ${e}`);
    } finally {
      setCleaningId(null);
    }
  };

  const handleCleanAll = async () => {
    if (!data) return;
    for (const cat of data.categories) {
      if (cat.size_bytes > 0 && !cleanedIds.has(cat.id)) {
        await handleCleanItem(cat);
      }
    }
  };

  const activeReclaimable = data
    ? data.categories
        .filter((c) => !cleanedIds.has(c.id))
        .reduce((acc, c) => acc + c.size_bytes, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Başlık Alanı */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <HardDrive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Disk Alanı & Shader Temizleyici
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                  Otomatik Analiz
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Steam shadercache, Mesa önbellekleri ve artık Proton prefix'lerini silin
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

        {/* Ana İçerik */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Özet Kartı */}
          <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Kazanılabilir Boş Alan
              </div>
              <div className="text-3xl font-black text-white tracking-tight">
                {loading ? "Hesaplanıyor..." : formatBytes(activeReclaimable)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadAnalysis}
                disabled={loading}
                className="h-10 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Yenile</span>
              </button>
              {activeReclaimable > 0 && (
                <button
                  type="button"
                  onClick={handleCleanAll}
                  disabled={loading || Boolean(cleaningId)}
                  className="h-10 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hepsini Temizle</span>
                </button>
              )}
            </div>
          </div>

          {/* Kategoriler Listesi */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Temizlenebilir Bileşenler
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-zinc-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
                <span>Disk dizinleri analiz ediliyor...</span>
              </div>
            ) : data?.categories.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500 rounded-2xl bg-zinc-900/30 border border-white/5">
                Temizlenecek gereksiz shader veya artık dosya bulunamadı. Diskiniz tertemiz!
              </div>
            ) : (
              data?.categories.map((cat) => {
                const isCleaned = cleanedIds.has(cat.id) || cat.size_bytes === 0;
                const isBusy = cleaningId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-white/15 p-4 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white truncate">
                          {cat.title}
                        </span>
                        {cat.safe_to_delete && (
                          <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            <ShieldCheck className="w-3 h-3 text-zinc-300" />
                            Güvenli
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-1.5">
                        {cat.description}
                      </p>
                      <div className="text-[10px] font-mono text-zinc-500 truncate">
                        {cat.path}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-black text-white tabular-nums">
                          {isCleaned ? "0 B" : formatBytes(cat.size_bytes)}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {cat.item_count} dosya
                        </div>
                      </div>

                      {isCleaned ? (
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400">
                          <CheckCircle2 className="w-4 h-4 text-zinc-300" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCleanItem(cat)}
                          disabled={isBusy}
                          className="h-9 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-xs font-semibold text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isBusy ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                          <span>Temizle</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bilgilendirme Alt Barı */}
        <div className="p-4 bg-zinc-950 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
            <span>Shader temizlendiğinde oyunlar bir sonraki açılışta shader'ları otomatik yeniden oluşturur.</span>
          </div>
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
