import { LayoutGrid, List, RefreshCw, Sliders } from "lucide-react";
import { InstallStatus, ViewMode } from "../types/game";

interface TopStatusBarProps {
  statusFilter: "all" | InstallStatus;
  onStatusFilterChange: (s: "all" | InstallStatus) => void;
  installedCount: number;
  cloudCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  scanning: boolean;
  onRescan: () => void;
  onOpenSettings: () => void;
}

export function TopStatusBar({
  statusFilter,
  onStatusFilterChange,
  installedCount,
  cloudCount,
  viewMode,
  onViewModeChange,
  scanning,
  onRescan,
  onOpenSettings,
}: TopStatusBarProps) {
  return (
    <header className="h-16 max-w-[1480px] w-full mx-auto px-8 lg:px-12 flex items-center justify-between shrink-0">
      {/* Sol: Overdrive tarzı minimalist amblem + marka */}
      <div
        onClick={() => onStatusFilterChange("all")}
        className="flex items-center gap-2.5 cursor-pointer select-none group"
      >
        <div className="w-6 h-6 rounded-full border-[2px] border-white flex items-center justify-center relative overflow-hidden">
          <div className="w-2.5 h-2.5 rounded-full bg-white group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-[16px] font-bold tracking-tight text-white">
          overdrive
        </span>
      </div>

      {/* Sağ: Pill navigasyon + Yenile + Ayarlar */}
      <div className="flex items-center gap-1.5 text-[13px]">
        <button
          onClick={() => onStatusFilterChange("all")}
          className={`px-4 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
            statusFilter === "all"
              ? "bg-[#17171c] text-white border border-white/15 shadow-sm"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          Kütüphane
        </button>

        <button
          onClick={() => onStatusFilterChange("installed")}
          className={`px-4 py-1.5 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            statusFilter === "installed"
              ? "bg-[#17171c] text-white border border-white/15 shadow-sm"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          <span>Yüklü</span>
          <span className="text-[11px] text-emerald-400 font-semibold">
            {installedCount}
          </span>
        </button>

        <button
          onClick={() => onStatusFilterChange("cloud")}
          className={`px-4 py-1.5 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            statusFilter === "cloud"
              ? "bg-[#17171c] text-white border border-white/15 shadow-sm"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          <span>Bulutta</span>
          <span className="text-[11px] text-zinc-500">{cloudCount}</span>
        </button>

        <div className="w-px h-4 bg-zinc-800 mx-1.5" />

        <button
          onClick={() => onViewModeChange(viewMode === "grid" ? "table" : "grid")}
          className="w-8 h-8 rounded-full bg-[#121216] hover:bg-[#1c1c22] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title={viewMode === "grid" ? "Liste görünümü" : "Poster görünümü"}
        >
          {viewMode === "grid" ? (
            <List className="w-3.5 h-3.5" />
          ) : (
            <LayoutGrid className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          onClick={onRescan}
          disabled={scanning}
          className="w-8 h-8 rounded-full bg-[#121216] hover:bg-[#1c1c22] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          title="Kütüphaneyi Yeniden Tara (R)"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin text-white" : ""}`} />
        </button>

        <button
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-full bg-[#17171c] hover:bg-[#222229] border border-white/12 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Sistem Hookları ve API Ayarları"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
