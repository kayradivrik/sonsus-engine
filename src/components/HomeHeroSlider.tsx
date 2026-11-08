import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Info } from "lucide-react";
import { UnifiedGame } from "../types/game";

interface HomeHeroSliderProps {
  games: UnifiedGame[];
  onOpenDetail: (game: UnifiedGame) => void;
  onLaunch: (game: UnifiedGame) => void;
}

export const HomeHeroSlider: React.FC<HomeHeroSliderProps> = ({
  games,
  onOpenDetail,
  onLaunch,
}) => {
  // Banner veya geniş kapak resmi olan popüler / son oynanan 6 oyunu seç
  const slides = React.useMemo(() => {
    if (!games || games.length === 0) return [];
    // Geniş kapak veya yüksek oynama süreli olanları öne çıkar
    const sorted = [...games].sort(
      (a, b) =>
        (b.last_played_epoch || 0) - (a.last_played_epoch || 0) ||
        b.playtime_minutes - a.playtime_minutes
    );
    return sorted.slice(0, 6);
  }, [games]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const current = slides[currentIndex];
  const heroImage =
    current.hero_path_or_url ||
    current.cover_path_or_url ||
    current.fallback_cover_url;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-[#0c0c12] border border-white/10 shadow-2xl mb-10 group">
      {/* Geniş Sinematik Arka Plan Görseli */}
      <div className="relative h-[380px] md:h-[440px] w-full overflow-hidden">
        {heroImage ? (
          <img
            key={current.id}
            src={heroImage}
            alt={current.title}
            className="w-full h-full object-cover object-center filter brightness-75 scale-100 transition-all duration-700 ease-out animate-in fade-in zoom-in-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-zinc-950 to-black" />
        )}

        {/* Sinematik Gradyan Karartmalar (Sol ve Alt) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c12] via-[#0c0c12]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c12] via-[#0c0c12]/70 to-transparent w-full md:w-2/3" />

        {/* Sol İçerik Paneli */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12 max-w-2xl z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-medium text-zinc-300">
              Öne Çıkan
            </span>
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              {current.platform}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-lg mb-3">
            {current.title}
          </h1>

          <p className="text-xs md:text-sm text-zinc-300 line-clamp-2 mb-6 max-w-lg leading-relaxed">
            {current.summary_hint ||
              `${current.genres?.join(", ") || "Aksiyon & Macera"} • ${
                current.status === "installed" ? "Yüklü" : "Bulut"
              }`}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onLaunch(current)}
              className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-md cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              {current.status === "installed" ? "Oyna" : "Detaylar"}
            </button>

            <button
              onClick={() => onOpenDetail(current)}
              className="px-5 py-2.5 rounded-full bg-[#181820]/80 hover:bg-[#22222c] backdrop-blur-md border border-white/15 text-zinc-200 font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-zinc-400" />
              İncele
            </button>
          </div>
        </div>

        {/* Sağ Taraf Thumbnail Önizleme Sekmeleri (Epic Games Store Tarzı) */}
        <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 flex-col gap-2.5 z-10 w-64">
          {slides.map((g, idx) => {
            const active = idx === currentIndex;
            return (
              <div
                key={g.id}
                onClick={() => setCurrentIndex(idx)}
                className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  active
                    ? "bg-white/20 border-white/40 backdrop-blur-md shadow-lg translate-x-1"
                    : "bg-black/40 border-white/5 hover:bg-black/60 opacity-60 hover:opacity-100"
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                  <img
                    src={g.cover_path_or_url || g.fallback_cover_url || ""}
                    alt={g.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{g.title}</div>
                  <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {g.genres?.[0] || g.platform}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alt Sol / Sağ Geçiş Okları */}
        <div className="absolute bottom-6 right-8 flex items-center gap-2 z-20 lg:hidden">
          <button
            onClick={() =>
              setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
            }
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 flex items-center justify-center text-white cursor-pointer backdrop-blur-md"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % slides.length)}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 flex items-center justify-center text-white cursor-pointer backdrop-blur-md"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

