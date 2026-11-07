import { memo, useEffect, useMemo, useState } from "react";
import { ArrowUpCircle, Download, Heart, Play } from "lucide-react";
import {
  DownloadTaskInfo,
  UnifiedGame,
  buildCoverCandidates,
  formatPlaytime,
  platformLabel,
} from "../types/game";

interface GameCardProps {
  game: UnifiedGame;
  isRunning: boolean;
  downloadTask?: DownloadTaskInfo;
  isGamepadFocused?: boolean;
  onOpenDetail: (game: UnifiedGame, autoOpenInstall?: boolean) => void;
  onLaunch: (game: UnifiedGame) => void;
  onToggleFavorite: (game: UnifiedGame) => void;
}

/**
 * `React.memo` ve CSS `content-visibility: auto` ile optimize edilmiş poster kartı.
 * Yüklü oyunlarda yeşil "Oyna", indirilenlerde canlı ilerleme çubuğu, buluttakilerde mavi "İndir" aksiyonunu vurgular.
 */
export const GameCard = memo(function GameCard({
  game,
  isRunning,
  downloadTask,
  isGamepadFocused,
  onOpenDetail,
  onLaunch,
  onToggleFavorite,
}: GameCardProps) {
  const candidates = useMemo(() => buildCoverCandidates(game), [game]);
  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [game.id, game.cover_path_or_url]);

  const activeCover =
    candidateIdx < candidates.length ? candidates[candidateIdx] : null;
  const isInstalled = game.status === "installed";
  const isDownloading = downloadTask?.status === "downloading";
  const isPaused = downloadTask?.status === "paused";

  const primaryGenre =
    game.genres && game.genres.length > 0
      ? game.genres[0]
      : game.developer
      ? game.developer
      : game.platform === "steam"
      ? "Steam"
      : game.platform === "epic"
      ? "Epic Games"
      : game.platform === "gog"
      ? "GOG"
      : "Yerel Oyun";

  const playtimeText = formatPlaytime(game.playtime_minutes);
  const subtitleParts = [primaryGenre];
  if (playtimeText) subtitleParts.push(playtimeText);

  return (
    <div
      onClick={() => onOpenDetail(game, false)}
      className="perf-card group flex flex-col cursor-pointer select-none"
    >
      {/* Yuvarlatılmış Dikey Poster */}
      <div
        className={`aspect-[2/3] w-full rounded-[11px] bg-[#0d0d12] relative overflow-hidden transition-transform duration-200 ease-out will-change-transform group-hover:-translate-y-1 ${
          isGamepadFocused
            ? "ring-4 ring-emerald-400 scale-[1.04] shadow-[0_0_30px_rgba(52,211,153,0.4)] z-10"
            : isRunning
            ? "ring-2 ring-amber-400"
            : isDownloading
            ? "ring-2 ring-blue-500/80"
            : isInstalled
            ? "ring-1 ring-emerald-500/35 group-hover:ring-emerald-400/80"
            : "ring-1 ring-white/[0.09] group-hover:ring-white/30"
        }`}
      >
        {activeCover ? (
          <img
            src={activeCover}
            alt={game.title}
            loading="lazy"
            decoding="async"
            onError={() => setCandidateIdx((prev) => prev + 1)}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#16161f] to-[#09090d] flex flex-col items-center justify-center p-4 text-center">
            <span className="text-xs font-semibold text-zinc-300 line-clamp-3 leading-snug">
              {game.title}
            </span>
          </div>
        )}

        {/* Sağ Üst Favori Kalp Butonu */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(game);
          }}
          title={game.is_favorite ? "Favorilerden çıkar" : "Favorilere ekle"}
          className={`absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            game.is_favorite
              ? "bg-black/75 border border-rose-500/50 text-rose-400 opacity-100"
              : "bg-black/65 border border-white/15 text-zinc-300 hover:text-rose-300 opacity-0 group-hover:opacity-100"
          }`}
        >
          <Heart
            className={`w-3.5 h-3.5 ${game.is_favorite ? "fill-rose-400" : ""}`}
          />
        </button>

        {/* Alt karartma */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

        {/* Sol Alt Mağaza & Kurulum Durumu Rozetleri */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
          <span className="bg-white text-black text-[9px] font-black tracking-wider uppercase px-2 py-[2px] rounded-[3px]">
            {platformLabel(game.platform)}
          </span>
          {isRunning ? (
            <span className="bg-amber-400 text-black text-[9px] font-extrabold uppercase px-1.5 py-[2px] rounded-[3px] animate-pulse">
              ÇALIŞIYOR
            </span>
          ) : isDownloading ? (
            <span className="bg-blue-500 text-white text-[9px] font-extrabold uppercase px-1.5 py-[2px] rounded-[3px]">
              %{Math.round(downloadTask.progress_percent)}
            </span>
          ) : isPaused ? (
            <span className="bg-amber-500 text-black text-[9px] font-extrabold uppercase px-1.5 py-[2px] rounded-[3px]">
              DURAKLATILDI
            </span>
          ) : game.update_available ? (
            <span className="bg-cyan-400 text-black text-[9px] font-extrabold uppercase px-1.5 py-[2px] rounded-[3px] inline-flex items-center gap-0.5">
              <ArrowUpCircle className="w-2.5 h-2.5" />
              <span>GÜNCELLEME</span>
            </span>
          ) : isInstalled ? (
            <span className="bg-emerald-500 text-black text-[9px] font-extrabold uppercase px-1.5 py-[2px] rounded-[3px]">
              YÜKLÜ
            </span>
          ) : null}
        </div>

        {/* Aktif İndirme İnce İlerleme Çizgisi */}
        {(isDownloading || isPaused) && downloadTask && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/70 z-10">
            <div
              className={`h-full transition-all duration-300 ${
                isPaused ? "bg-amber-400" : "bg-blue-500"
              }`}
              style={{
                width: `${Math.max(2, Math.min(100, downloadTask.progress_percent))}%`,
              }}
            />
          </div>
        )}

        {/* Hover Hızlı Eylem Katmanı */}
        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center p-3">
          {isInstalled ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLaunch(game);
              }}
              disabled={isRunning}
              className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>{isRunning ? "Çalışıyor" : "Oyna"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(game, !isDownloading && !isPaused);
              }}
              className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? "İndiriliyor" : "İndir"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Poster Altı Başlık & Alt Bilgi */}
      <div className="pt-2.5 px-0.5">
        <div className="text-[11px] text-zinc-500 font-medium truncate">
          {subtitleParts.join(" • ")}
        </div>
        <div
          className="text-[13px] text-zinc-100 font-semibold leading-snug mt-0.5 truncate group-hover:text-white"
          title={game.title}
        >
          {game.title}
        </div>
      </div>
    </div>
  );
});
