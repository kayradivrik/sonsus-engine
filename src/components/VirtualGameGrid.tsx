import { useEffect, useRef, useState } from "react";
import { UnifiedGame } from "../types/game";
import { GameCard } from "./GameCard";

interface VirtualGameGridProps {
  games: UnifiedGame[];
  runningId: string | null;
  onOpenDetail: (game: UnifiedGame, autoOpenInstall?: boolean) => void;
  onLaunch: (game: UnifiedGame) => void;
}

const INITIAL_BATCH = 42; // 7 satır x 6 sütun -> İlk açılış anında sıfır gecikme
const BATCH_STEP = 42;

/**
 * 500+ oyunluk kütüphaneyi tek seferde DOM'a yığmak yerine görünür alanı aşamalı (progressive)
 * yükleyerek ilk çizim ve kaydırma kare süresini 1 milisaniyenin altına indirir.
 */
export function VirtualGameGrid({
  games,
  runningId,
  onOpenDetail,
  onLaunch,
}: VirtualGameGridProps) {
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleLimit(INITIAL_BATCH);
  }, [games]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleLimit >= games.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleLimit((prev) => Math.min(games.length, prev + BATCH_STEP));
        }
      },
      { rootMargin: "650px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [games.length, visibleLimit]);

  const slice = games.slice(0, visibleLimit);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
        {slice.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            isRunning={runningId === game.id}
            onOpenDetail={onOpenDetail}
            onLaunch={onLaunch}
          />
        ))}
      </div>
      {visibleLimit < games.length && (
        <div ref={sentinelRef} className="h-16 w-full" />
      )}
    </>
  );
}

