import { useTranslation } from "../i18n/useTranslation";
import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { UnifiedGame } from "../types/game";
import { GameCard } from "./GameCard";

interface HomeCategoryShelfProps {
  title: string;
  badgeIcon?: React.ReactNode;
  games: UnifiedGame[];
  runningId: string | null;
  onOpenDetail: (game: UnifiedGame) => void;
  onLaunch: (game: UnifiedGame) => void;
  onToggleFavorite: (game: UnifiedGame) => void;
  onViewCategoryAll?: () => void;
  onContextMenu?: (game: UnifiedGame, x: number, y: number) => void;
}

export const HomeCategoryShelf: React.FC<HomeCategoryShelfProps> = ({
  title,
  badgeIcon,
  games,
  runningId,
  onOpenDetail,
  onLaunch,
  onToggleFavorite,
  onViewCategoryAll,
  onContextMenu,
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!games || games.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -600 : 600;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <section className="mb-10">
      {/* Raf Başlığı & "Kategoriyi Göster / Tümünü Gör" Butonu */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          {badgeIcon && <span className="text-sm">{badgeIcon}</span>}
          <h2 className="text-base md:text-lg font-bold text-white tracking-wide">
            {title}
          </h2>
          <span className="text-xs text-white/40 tabular-nums">({games.length})</span>
        </div>

        <div className="flex items-center gap-2">
          {onViewCategoryAll && (
            <button
              onClick={onViewCategoryAll}
              className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer mr-2"
            >
              <span>{t.viewCategory}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => scroll("left")}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer transition-colors"
            title="Sola kaydır"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer transition-colors"
            title="Sağa kaydır"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Yatay Akıcı Poster Şeridi */}
      <div
        ref={scrollRef}
        className="flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2"
      >
        {games.map((game) => (
          <div key={game.id} className="w-[160px] sm:w-[180px] shrink-0">
            <GameCard
              game={game}
              isRunning={runningId === game.id}
              onOpenDetail={onOpenDetail}
              onLaunch={onLaunch}
              onToggleFavorite={onToggleFavorite}
              onContextMenu={onContextMenu}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

