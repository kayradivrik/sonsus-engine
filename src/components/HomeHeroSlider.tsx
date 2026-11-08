import React, { useState, useEffect, useRef, memo } from "react";
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

const SLIDE_DURATION_MS = 7000;

/**
 * Sağ taraftaki küçük sekme kartı.
 * Kendi resim fallback zincirine sahiptir (yerel cache -> asset -> fallback -> Steam CDN -> harf rozeti).
 * Asla bozuk resim ikonuna düşmez.
 */
const HeroSlideThumb = memo(function HeroSlideThumb({
  game,
  active,
  onClick,
  progressKey,
}: {
  game: UnifiedGame;
  active: boolean;
  onClick: () => void;
  progressKey: number;
}) {
  const candidates = React.useMemo(() => buildCoverCandidates(game), [game]);
  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [game.id, game.cover_path_or_url]);

  const thumbUrl =
    candidateIdx < candidates.length ? candidates[candidateIdx] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full flex-1 rounded-2xl p-2.5 border flex items-center gap-3 cursor-pointer transition-all duration-200 overflow-hidden select-none text-left outline-none ${
        active
          ? "bg-zinc-900/95 border-white/30 text-white shadow-lg"
          : "bg-zinc-950/60 hover:bg-zinc-900/60 border-white/[0.06] hover:border-white/15 text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {/* Sol Küçük Poster Küçük Resmi */}
      <div className="w-10 h-13 rounded-lg bg-zinc-900 overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={game.title}
            onError={() => setCandidateIdx((prev) => prev + 1)}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[11px] font-bold text-zinc-500 uppercase">
            {game.title.slice(0, 2)}
          </div>
        )}
      </div>

      {/* Başlık ve Tür Bilgisi */}
      <div className="min-w-0 flex-1">
        <div
          className={`text-xs font-bold truncate ${
            active ? "text-white" : "text-zinc-300"
          }`}
        >
          {game.title}
        </div>
        <div className="text-[10px] text-zinc-500 truncate mt-0.5">
          {game.genres?.[0] || game.platform.toUpperCase()}
        </div>
      </div>

      {/* Aktif Slayt İçin Otomatik Geçiş İlerleme Çizgisi */}
      {active && (
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/20">
          <div
            key={progressKey}
            className="h-full bg-white transition-all ease-linear"
            style={{
              animation: `heroProgress ${SLIDE_DURATION_MS}ms linear forwards`,
            }}
          />
        </div>
      )}
    </button>
  );
});

export const HomeHeroSlider: React.FC<HomeHeroSliderProps> = ({
  games,
  onOpenDetail,
  onLaunch,
}) => {
  // Banner veya geniş kapak resmi olan popüler / son oynanan 5-6 oyunu seç
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
  const [progressKey, setProgressKey] = useState(0);
  const timerRef = useRef<any>(null);

  // Slayt değiştikçe resim fallback indeksini sıfırla ve timer'ı yeniden kur
  useEffect(() => {
    setHeroImgIdx(0);
    setProgressKey((prev) => prev + 1);
  }, [currentIndex]);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timerRef.current);
  }, [slides.length, progressKey]);

  if (slides.length === 0) return null;

  const current = slides[currentIndex];
  const heroCandidates = buildHeroCandidates(current);
  const activeHeroImg =
    heroImgIdx < heroCandidates.length ? heroCandidates[heroImgIdx] : null;

  const handleSelectSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  return (
    <div className="w-full mb-12">
      {/* Epic Games Store Tarzı İki Kolonlu Vitrin (Sol: Geniş Sinematik Afiş, Sağ: Ayrı Yan Kart Listesi) */}
      <div className="flex flex-col lg:flex-row gap-3.5 items-stretch w-full">
        {/* SOL: Sinematik Ana Afiş (Görseli Asla Kapatmayan Tam Alan) */}
        <div className="flex-1 min-w-0 relative h-[400px] sm:h-[460px] md:h-[490px] lg:h-[510px] rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl group flex flex-col justify-end">
          {/* Arka Plan Görseli */}
          <div className="absolute inset-0 overflow-hidden">
            {activeHeroImg ? (
              <img
                key={`${current.id}-${activeHeroImg}`}
                src={activeHeroImg}
                alt={current.title}
                onError={() => setHeroImgIdx((prev) => prev + 1)}
                className="w-full h-full object-cover object-center filter brightness-[0.78] transition-all duration-700 ease-out"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-black to-zinc-950 flex items-center justify-end pr-16 select-none pointer-events-none">
                <span className="text-8xl font-black text-white/[0.04] uppercase tracking-tighter">
                  {current.title.slice(0, 10)}
                </span>
              </div>
            )}

            {/* Sol ve Alt Doğal Karartma (Yazıların Okunması İçin - Sağdaki Karakter Sanatını Kapatmaz) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-transparent w-full md:w-3/5" />
          </div>

          {/* Sol Alt İçerik Alanı */}
          <div className="relative z-10 p-7 sm:p-10 md:p-12 max-w-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-zinc-200">
                Öne Çıkan
              </span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold px-2 py-0.5 rounded bg-black/60 border border-white/10">
                {current.platform}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.08] drop-shadow-xl mb-3 line-clamp-2">
              {current.title}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 mb-6 leading-relaxed">
              {current.summary_hint ||
                `${current.genres?.join(", ") || "Aksiyon & Macera"} • ${
                  current.status === "installed"
                    ? "Bilgisayarda Yüklü"
                    : "Bulut Kütüphanesi"
                }`}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onLaunch(current)}
                className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black font-extrabold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-xl cursor-pointer"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>{current.status === "installed" ? "Oyna" : "Detaylar"}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDetail(current)}
                className="px-5 py-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 text-zinc-200 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Info className="w-4 h-4 text-zinc-400" />
                <span>İncele</span>
              </button>
            </div>
          </div>

          {/* Mobil / Dar Ekran İçin Küçük İlerleme Okları */}
          <div className="absolute bottom-5 right-6 flex items-center gap-2 z-20 lg:hidden">
            <button
              type="button"
              onClick={() =>
                handleSelectSlide((currentIndex - 1 + slides.length) % slides.length)
              }
              className="w-8 h-8 rounded-full bg-black/80 hover:bg-black border border-white/20 flex items-center justify-center text-white cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-zinc-400 font-mono">
              {currentIndex + 1} / {slides.length}
            </span>
            <button
              type="button"
              onClick={() => handleSelectSlide((currentIndex + 1) % slides.length)}
              className="w-8 h-8 rounded-full bg-black/80 hover:bg-black border border-white/20 flex items-center justify-center text-white cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SAĞ: Epic Games Tarzı Ayrı Yan Sütun Listesi (Afişin Dışında!) */}
        <div className="hidden lg:flex w-64 xl:w-72 2xl:w-80 shrink-0 flex-col justify-between gap-2 h-[400px] sm:h-[460px] md:h-[490px] lg:h-[510px]">
          {slides.map((g, idx) => (
            <HeroSlideThumb
              key={g.id}
              game={g}
              active={idx === currentIndex}
              onClick={() => handleSelectSlide(idx)}
              progressKey={progressKey}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
