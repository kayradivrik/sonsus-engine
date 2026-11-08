import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Info } from "lucide-react";
import {
  UnifiedGame,
  buildCoverCandidates,
  buildHeroCandidates,
} from "../types/game";

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
    const sorted = [...games].sort(
      (a, b) =>
        (b.last_played_epoch || 0) - (a.last_played_epoch || 0) ||
        b.playtime_minutes - a.playtime_minutes
    );
    return sorted.slice(0, 6);
  }, [games]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [heroImgIdx, setHeroImgIdx] = useState(0);
  const timerRef = useRef<any>(null);

  // Slayt değiştikçe resim fallback indeksini sıfırla
  useEffect(() => {
    setHeroImgIdx(0);
  }, [currentIndex]);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const current = slides[currentIndex];
  const heroCandidates = buildHeroCandidates(current);
  const activeHeroImg =
    heroImgIdx < heroCandidates.length ? heroCandidates[heroImgIdx] : null;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-[#0a0a0f] border border-white/10 shadow-2xl mb-12 group">
      {/* Geniş Sinematik Arka Plan Görseli */}
      <div className="relative h-[400px] md:h-[460px] lg:h-[500px] w-full overflow-hidden bg-black">
        {activeHeroImg ? (
          <img
            key={`${current.id}-${activeHeroImg}`}
            src={activeHeroImg}
            alt={current.title}
            onError={() => setHeroImgIdx((prev) => prev + 1)}
            className="w-full h-full object-cover object-center filter brightness-[0.72] scale-100 transition-all duration-700 ease-out animate-in fade-in zoom-in-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-zinc-950 via-zinc-900 to-black" />
        )}

        {/* Sinematik Gradyan Karartmalar (Sol ve Alt) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent w-full md:w-2/3" />

        {/* Sol İçerik Paneli */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-14 max-w-2xl z-10">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-zinc-200">
              Öne Çıkan
            </span>
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold px-2 py-0.5 rounded bg-black/60 border border-white/10">
              {current.platform}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-2xl mb-3">
            {current.title}
          </h1>

          <p className="text-xs md:text-sm text-zinc-300 line-clamp-2 mb-7 max-w-lg leading-relaxed">
            {current.summary_hint ||
              `${current.genres?.join(", ") || "Aksiyon & Macera"} • ${
                current.status === "installed" ? "Bilgisayarda Yüklü" : "Bulut Kütüphanesi"
              }`}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onLaunch(current)}
              className="px-7 py-3 rounded-full bg-white hover:bg-zinc-200 text-black font-extrabold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-xl cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>{current.status === "installed" ? "Oyna" : "Detaylar"}</span>
            </button>

            <button
              onClick={() => onOpenDetail(current)}
              className="px-6 py-3 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 text-zinc-200 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4 text-zinc-400" />
              <span>İncele</span>
            </button>
          </div>
        </div>

        {/* Sağ Taraf Thumbnail Önizleme Sekmeleri (Epic Games Store Tarzı) */}
        <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 flex-col gap-2.5 z-10 w-72">
          {slides.map((g, idx) => {
            const active = idx === currentIndex;
            const coverCandidates = buildCoverCandidates(g);
            const thumbUrl = coverCandidates[0] || null;

            return (
              <div
                key={g.id}
                onClick={() => setCurrentIndex(idx)}
                className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all duration-150 ${
                  active
                    ? "bg-zinc-900/95 border-white/40 shadow-lg translate-x-1"
                    : "bg-black/60 border-white/5 hover:bg-zinc-900/60 opacity-60 hover:opacity-100"
                }`}
              >
                <div className="w-12 h-14 rounded-lg bg-zinc-900 overflow-hidden shrink-0 border border-white/10">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={g.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{g.title}</div>
                  <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {g.genres?.[0] || g.platform.toUpperCase()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobil / Dar Ekran Geçiş Okları */}
        <div className="absolute bottom-6 right-8 flex items-center gap-2 z-20 lg:hidden">
          <button
            onClick={() =>
              setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
            }
            className="w-9 h-9 rounded-full bg-black/80 hover:bg-black border border-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % slides.length)}
            className="w-9 h-9 rounded-full bg-black/80 hover:bg-black border border-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
