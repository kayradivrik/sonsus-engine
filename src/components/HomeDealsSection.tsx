import React, { useState, useEffect } from "react";
import { Gift, ExternalLink } from "lucide-react";
import { GameDealItem } from "../types/game";
import { tauriApi } from "../api/tauriClient";

export const HomeDealsSection: React.FC = () => {
  const [deals, setDeals] = useState<GameDealItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tauriApi
      .getCuratedDeals()
      .then((data) => setDeals(data))
      .catch((e) => console.error("Fırsatlar yüklenemedi:", e))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && deals.length === 0) return null;

  const handleOpenLink = (url: string) => {
    tauriApi.openExternalUrl(url).catch(() => window.open(url, "_blank"));
  };

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
            <Gift className="w-3.5 h-3.5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Haftalık Fırsatlar & Ücretsiz Oyunlar
            </h2>
            <p className="text-[11px] text-zinc-400">
              Epic Games ve Steam vitrinindeki indirimler
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-white/[0.03] animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {deals.slice(0, 6).map((deal) => (
            <div
              key={deal.id}
              onClick={() => handleOpenLink(deal.store_url)}
              className="group relative rounded-2xl bg-[#0f0f16] border border-white/10 hover:border-white/30 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col"
            >
              {/* Banner Görseli */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-900">
                {deal.banner_url ? (
                  <img
                    src={deal.banner_url}
                    alt={deal.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-white/30">
                    Görsel Yok
                  </div>
                )}

                {/* İndirim / Ücretsiz Rozeti */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      deal.is_free
                        ? "bg-white text-black"
                        : "bg-zinc-800 border border-white/20 text-zinc-100"
                    }`}
                  >
                    {deal.is_free ? "ÜCRETSİZ" : `-%${deal.discount_percent}`}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[9px] uppercase tracking-wider text-zinc-400 font-medium border border-white/10">
                    {deal.store}
                  </span>
                </div>
              </div>

              {/* Başlık ve Fiyat Paneli */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div className="text-xs font-semibold text-zinc-100 line-clamp-1 group-hover:text-white transition-colors">
                  {deal.title}
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    {deal.original_price && (
                      <span className="text-[10px] text-zinc-500 line-through">
                        {deal.original_price}
                      </span>
                    )}
                    <span className="text-xs font-bold text-zinc-100">
                      {deal.final_price}
                    </span>
                  </div>

                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
