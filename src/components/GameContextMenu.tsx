import React, { useEffect, useRef } from "react";
import {
  Play,
  Share2,
  FolderOpen,
  RotateCcw,
  Heart,
  EyeOff,
  Eye,
  Info,
} from "lucide-react";
import { UnifiedGame } from "../types/game";

export interface ContextMenuPosition {
  x: number;
  y: number;
  game: UnifiedGame;
}

interface GameContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
  onLaunch: (game: UnifiedGame) => void;
  onOpenDetail: (game: UnifiedGame) => void;
  onToggleFavorite: (game: UnifiedGame) => void;
  onToggleHide?: (game: UnifiedGame) => void;
  onCreateShortcut: (game: UnifiedGame) => void;
  onOpenFolder: (game: UnifiedGame) => void;
  onCleanPrefix: (game: UnifiedGame) => void;
}

export const GameContextMenu: React.FC<GameContextMenuProps> = ({
  position,
  onClose,
  onLaunch,
  onOpenDetail,
  onToggleFavorite,
  onToggleHide,
  onCreateShortcut,
  onOpenFolder,
  onCleanPrefix,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (position) {
      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [position, onClose]);

  if (!position) return null;

  const { x, y, game } = position;
  const isInstalled = game.status === "installed";

  // Ekran taşmasını önle
  const menuWidth = 240;
  const menuHeight = 310;
  const safeX = Math.min(x, window.innerWidth - menuWidth - 16);
  const safeY = Math.min(y, window.innerHeight - menuHeight - 16);

  return (
    <div
      ref={menuRef}
      style={{ left: `${safeX}px`, top: `${safeY}px` }}
      className="fixed z-50 w-60 rounded-xl bg-[#121217] border border-white/12 shadow-2xl p-1.5 text-xs text-zinc-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Oyun Başlığı */}
      <div className="px-2.5 py-1.5 border-b border-white/[0.08] mb-1">
        <div className="font-bold text-white truncate">{game.title}</div>
        <div className="text-[10px] text-zinc-400 capitalize">{game.platform}</div>
      </div>

      <div className="space-y-0.5">
        {/* Başlat / Detay */}
        <button
          type="button"
          onClick={() => {
            onLaunch(game);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white hover:text-black font-semibold transition-colors cursor-pointer text-left"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{isInstalled ? "Oyunu Başlat" : "İndir / Kur"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenDetail(game);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
        >
          <Info className="w-3.5 h-3.5 text-zinc-400" />
          <span>Detayları Görüntüle</span>
        </button>

        <div className="h-[1px] bg-white/[0.08] my-1" />

        {/* Masaüstü Kısayolu */}
        <button
          type="button"
          onClick={() => {
            onCreateShortcut(game);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
        >
          <Share2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>Masaüstü Kısayolu Oluştur</span>
        </button>

        {/* Dosya Konumunu Aç */}
        {isInstalled && (
          <button
            type="button"
            onClick={() => {
              onOpenFolder(game);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>Dosya Konumunu Aç</span>
          </button>
        )}

        {/* Proton Önekini Sıfırla */}
        <button
          type="button"
          onClick={() => {
            onCleanPrefix(game);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
          title="Oyun çöktüğünde veya açılmadığında Wine/Proton önekini sıfırlar"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
          <span>Proton Önekini Sıfırla</span>
        </button>

        <div className="h-[1px] bg-white/[0.08] my-1" />

        {/* Favori */}
        <button
          type="button"
          onClick={() => {
            onToggleFavorite(game);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
        >
          <Heart className={`w-3.5 h-3.5 ${game.is_favorite ? "fill-white text-white" : "text-zinc-400"}`} />
          <span>{game.is_favorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}</span>
        </button>

        {/* Gizle */}
        {onToggleHide && (
          <button
            type="button"
            onClick={() => {
              onToggleHide(game);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer text-left"
          >
            {game.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{game.is_hidden ? "Gizliliği Kaldır" : "Kütüphaneden Gizle"}</span>
          </button>
        )}
      </div>
    </div>
  );
};
