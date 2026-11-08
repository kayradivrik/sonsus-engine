import { Clock, Play } from "lucide-react";
import {
  UnifiedGame,
  buildCoverCandidates,
  formatEpochDate,
  formatPlaytime,
  platformLabel,
} from "../types/game";
import { useTranslation } from "../i18n/useTranslation";

interface RecentShelfProps {
  games: UnifiedGame[];
  runningId: string | null;
  onOpenDetail: (game: UnifiedGame) => void;
  onLaunch: (game: UnifiedGame) => void;
}

/**
 * Kütüphanenin en üstünde yer alan "Son Oynananlar / Kaldığın Yerden Devam Et" yatay şeridi.
 */
export function RecentShelf({
  games,
  runningId,
  onOpenDetail,
  onLaunch,
}: RecentShelfProps) {
  const { t } = useTranslation();
  if (games.length === 0) return null;

  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>{t.recentGames}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {games.slice(0, 4).map((game) => {
          const cover = buildCoverCandidates(game)[0] ?? null;
          const isInstalled = game.status === "installed";
          const isRunning = runningId === game.id;
          const pt = formatPlaytime(game.playtime_minutes);

          return (
            <div
              key={game.id}
              onClick={() => onOpenDetail(game)}
              className="group p-3 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-white/[0.08] hover:border-white/20 flex items-center gap-3.5 cursor-pointer transition-all"
            >
              <div className="w-12 h-16 rounded-lg overflow-hidden bg-black shrink-0 ring-1 ring-white/10">
                {cover ? (
                  <img
                    src={cover}
                    alt={game.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : null}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="bg-zinc-800 text-zinc-300 border border-white/10 text-[8px] font-bold uppercase px-1.5 py-[1px] rounded">
                    {platformLabel(game.platform)}
                  </span>
                  {pt && (
                    <span className="text-[11px] text-zinc-300 font-medium">
                      {pt}
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-white truncate mt-1">
                  {game.title}
                </div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                  {formatEpochDate(game.last_played_epoch)}
                </div>
              </div>

              {isInstalled && (
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLaunch(game);
                  }}
                  title={t.play}
                  className="w-9 h-9 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

