import { Download, Heart, Play } from "lucide-react";
import {
  UnifiedGame,
  formatBytes,
  formatEpochDate,
  formatPlaytime,
  platformLabel,
} from "../types/game";

interface GameTableProps {
  games: UnifiedGame[];
  runningId: string | null;
  onOpenDetail: (game: UnifiedGame, autoOpenInstall?: boolean) => void;
  onLaunch: (game: UnifiedGame) => void;
  onToggleFavorite: (game: UnifiedGame) => void;
}

export function GameTable({
  games,
  runningId,
  onOpenDetail,
  onLaunch,
  onToggleFavorite,
}: GameTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#09090c]">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="text-zinc-500 border-b border-white/[0.08] text-[11px]">
          <tr>
            <th className="py-3 px-4 font-medium w-10"></th>
            <th className="py-3 px-4 font-medium">Oyun</th>
            <th className="py-3 px-4 font-medium w-28">Mağaza</th>
            <th className="py-3 px-4 font-medium w-28">Durum</th>
            <th className="py-3 px-4 font-medium w-28">Süre</th>
            <th className="py-3 px-4 font-medium w-28">Boyut</th>
            <th className="py-3 px-4 font-medium w-32">Son Oynama</th>
            <th className="py-3 px-4 font-medium w-32 text-right">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {games.map((g) => {
            const isRunning = runningId === g.id;
            const isInst = g.status === "installed";

            return (
              <tr
                key={g.id}
                onClick={() => onOpenDetail(g, false)}
                className="cursor-pointer transition-colors hover:bg-white/[0.04]"
              >
                <td className="py-2.5 pl-4 pr-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(g);
                    }}
                    className="text-zinc-500 hover:text-white cursor-pointer"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        g.is_favorite ? "text-white fill-white" : ""
                      }`}
                    />
                  </button>
                </td>
                <td className="py-2.5 px-4 font-semibold text-zinc-100 truncate max-w-md">
                  {g.title}
                </td>
                <td className="py-2.5 px-4">
                  <span className="bg-zinc-800 text-zinc-200 border border-white/10 text-[9px] font-bold uppercase px-2 py-0.5 rounded">
                    {platformLabel(g.platform)}
                  </span>
                </td>
                <td className="py-2.5 px-4">
                  {isRunning ? (
                    <span className="text-white font-semibold">Çalışıyor</span>
                  ) : isInst ? (
                    <span className="text-zinc-300 font-medium">Yüklü</span>
                  ) : (
                    <span className="text-zinc-500">Bulutta</span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-zinc-400">
                  {formatPlaytime(g.playtime_minutes) || "—"}
                </td>
                <td className="py-2.5 px-4 text-zinc-400">
                  {isInst ? formatBytes(g.size_bytes) : "—"}
                </td>
                <td className="py-2.5 px-4 text-zinc-500">
                  {formatEpochDate(g.last_played_epoch)}
                </td>
                <td className="py-2 px-4 text-right">
                  {isInst ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLaunch(g);
                      }}
                      disabled={isRunning}
                      className="px-3.5 py-1 rounded-full bg-white hover:bg-zinc-200 text-black text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-black" />
                      <span>Oyna</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetail(g, true);
                      }}
                      className="px-3.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>İndir</span>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
