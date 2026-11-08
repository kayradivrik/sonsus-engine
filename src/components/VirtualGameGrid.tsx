import { DownloadTaskInfo, UnifiedGame } from "../types/game";
import { GameCard } from "./GameCard";

interface VirtualGameGridProps {
  games: UnifiedGame[];
  runningId: string | null;
  downloadsById: Map<string, DownloadTaskInfo>;
  focusedIndex?: number;
  onOpenDetail: (game: UnifiedGame, autoOpenInstall?: boolean) => void;
  onLaunch: (game: UnifiedGame) => void;
  onToggleFavorite: (game: UnifiedGame) => void;
  onContextMenu?: (game: UnifiedGame, x: number, y: number) => void;
}

/**
 * Sayfalanmış (`paginatedGames`) poster ızgarasını geniş ekranlarla tam uyumlu,
 * akıcı ve dengeli kolon sayısıyla çizer.
 */
export function VirtualGameGrid({
  games,
  runningId,
  downloadsById,
  focusedIndex,
  onOpenDetail,
  onLaunch,
  onToggleFavorite,
  onContextMenu,
}: VirtualGameGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-5 gap-y-7">
      {games.map((game, idx) => (
        <GameCard
          key={game.id}
          game={game}
          isRunning={runningId === game.id}
          downloadTask={downloadsById.get(game.id)}
          isGamepadFocused={focusedIndex === idx}
          onOpenDetail={onOpenDetail}
          onLaunch={onLaunch}
          onToggleFavorite={onToggleFavorite}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}
