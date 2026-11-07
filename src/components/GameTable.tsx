import { Download, Play } from "lucide-react";
import {
  UnifiedGame,
  formatBytes,
  formatEpochDate,
  formatPlaytime,
} from "../types/game";

interface GameTableProps {
  games: UnifiedGame[];
  runningId: string | null;
  onOpenDetail: (game: UnifiedGame, autoOpenInstall?: boolean) => void;
  onLaunch: (game: UnifiedGame) => void;
}

export function GameTable({
  games,
  runningId,
  onOpenDetail,
  onLaunch,
}: GameTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#09090c]">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="text-zinc-500 border-b border-white/[0.08] text-[11px]">
          <tr>
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
                <td className="py-2.5 px-4 font-semibold text-zinc-100 truncate max-w-md">
                  {g.title}
                </td>
                <td className="py-2.5 px-4">
                  <span className="bg-white text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-[3px]">
                    {g.platform}
                  </span>
                </td>
                <td className="py-2.5 px-4">
                  {isRunning ? (
                    <span className="text-amber-400 font-semibold">Çalışıyor</span>
                  ) : isInst ? (
                    <span className="text-emerald-400 font-semibold">Yüklü</span>
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
                      className="px-3.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
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
                      className="px-3.5 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
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
