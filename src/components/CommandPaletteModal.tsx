import { useEffect, useMemo, useRef, useState } from "react";
import { Command, CornerDownLeft, Download, Heart, Play, Search } from "lucide-react";
import {
  UnifiedGame,
  buildCoverCandidates,
  formatPlaytime,
  platformLabel,
} from "../types/game";

interface CommandPaletteModalProps {
  open: boolean;
  games: UnifiedGame[];
  onClose: () => void;
  onLaunch: (game: UnifiedGame) => void;
  onOpenDetail: (game: UnifiedGame, autoOpenInstall?: boolean) => void;
}

/**
 * `Ctrl+K` / `⌘K` Hızlı Başlatma ve Arama Paleti.
 * Klavyeden ok tuşlarıyla gezinip `Enter` ile yüklü oyunu anında başlatır veya detayını açar.
 */
export function CommandPaletteModal({
  open,
  games,
  onClose,
  onLaunch,
  onOpenDetail,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = games.filter((g) => !g.is_hidden);

    if (!q) {
      return [...visible]
        .sort((a, b) => {
          if (Boolean(a.is_favorite) !== Boolean(b.is_favorite)) {
            return a.is_favorite ? -1 : 1;
          }
          if (a.status !== b.status) return a.status === "installed" ? -1 : 1;
          return (b.last_played_epoch ?? 0) - (a.last_played_epoch ?? 0);
        })
        .slice(0, 10);
    }

    return visible
      .filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          (g.developer ?? "").toLowerCase().includes(q) ||
          g.platform.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const aStarts = a.title.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.title.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        if (a.status !== b.status) return a.status === "installed" ? -1 : 1;
        return a.title.localeCompare(b.title);
      })
      .slice(0, 12);
  }, [games, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const executeItem = (game: UnifiedGame, forceDetail = false) => {
    onClose();
    if (!forceDetail && game.status === "installed") {
      onLaunch(game);
    } else {
      onOpenDetail(game, false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-[12vh] p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) =>
              results.length > 0 ? (i + 1) % results.length : 0
            );
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) =>
              results.length > 0 ? (i - 1 + results.length) % results.length : 0
            );
          } else if (e.key === "Enter" && results[activeIndex]) {
            e.preventDefault();
            executeItem(results[activeIndex], e.shiftKey);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
        className="w-full max-w-xl rounded-2xl bg-[#09090d] border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden"
      >
        {/* Arama Girişi */}
        <div className="h-14 px-4 border-b border-white/[0.08] flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hızlı oyun başlat veya ara... (Yüklü oyunlarda Enter = Oyna)"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
          />
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-[10px] font-mono text-zinc-400">
            ESC
          </span>
        </div>

        {/* Sonuç Listesi */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500">
              Eşleşen oyun bulunamadı.
            </div>
          ) : (
            results.map((game, idx) => {
              const active = idx === activeIndex;
              const cover = buildCoverCandidates(game)[0] ?? null;
              const isInstalled = game.status === "installed";
              const pt = formatPlaytime(game.playtime_minutes);

              return (
                <div
                  key={game.id}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => executeItem(game, false)}
                  className={`p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    active ? "bg-white/[0.1] text-white" : "text-zinc-300 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-11 rounded-md overflow-hidden bg-[#14141d] shrink-0 ring-1 ring-white/10">
                      {cover ? (
                        <img
                          src={cover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">
                          {game.title}
                        </span>
                        {game.is_favorite && (
                          <Heart className="w-3 h-3 text-white fill-white shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                        <span className="uppercase font-mono text-[10px] text-zinc-400">
                          {platformLabel(game.platform)}
                        </span>
                        {pt && <span>• {pt}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        executeItem(game, true);
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] bg-white/[0.06] hover:bg-white/15 text-zinc-300 cursor-pointer"
                    >
                      Detay
                    </button>

                    {isInstalled ? (
                      <span className="px-3 py-1 rounded-full bg-white text-black text-[11px] font-bold inline-flex items-center gap-1">
                        <Play className="w-3 h-3 fill-black" />
                        <span>Oyna</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-200 text-[11px] font-semibold inline-flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span>Bulut</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Alt Kısayol İpucu */}
        <div className="px-4 py-2.5 border-t border-white/[0.06] bg-black/60 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <Command className="w-3.5 h-3.5" />
            <span>sonsus-engine hızlı başlatıcı</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>Enter: Başlat / Aç • Shift+Enter: Detay Sayfası</span>
          </span>
        </div>
      </div>
    </div>
  );
}

