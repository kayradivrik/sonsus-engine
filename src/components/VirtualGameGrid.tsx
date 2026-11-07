import { DownloadTaskInfo, UnifiedGame } from "../types/game";
import { GameCard } from "./GameCard";

interface VirtualGameGridProps {
  games: UnifiedGame[];
  runningId: string | null;
  downloadsById: Map<string, DownloadTaskInfo>;
  onOpenDetail: (game: UnifiedGame, autoOpenInstall?: boolean) => void;
  onLaunch: (game: UnifiedGame) => void;
}

/**
 * Sayfalanmış (`paginatedGames`) poster ızgarasını sıfır DOM şişmesiyle çizer.
 */
export function VirtualGameGrid({
  games,
  runningId,
  downloadsById,
  onOpenDetail,
  onLaunch,
}: VirtualGameGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          isRunning={runningId === game.id}
          downloadTask={downloadsById.get(game.id)}
          onOpenDetail={onOpenDetail}
          onLaunch={onLaunch}
        />
      ))}
    </div>
  );
}
