import {
  BarChart3,
  Command,
  Compass,
  Download,
  Gamepad2,
  Heart,
  LayoutGrid,
  Library,
  List,
  Plus,
  RefreshCw,
  Sliders,
  Terminal,
  User,
  Zap,
} from "lucide-react";
import { AppNavTab, LibraryQuickFilter, ViewMode } from "../types/game";

interface TopStatusBarProps {
  currentTab: AppNavTab;
  onTabChange: (tab: AppNavTab) => void;
  statusFilter: LibraryQuickFilter;
  onStatusFilterChange: (s: LibraryQuickFilter) => void;
  installedCount: number;
  cloudCount: number;
  favoritesCount: number;
  playerName?: string | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  scanning: boolean;
  onRescan: () => void;
  activeDownloadsCount: number;
  totalDownloadsCount: number;
  averageDownloadPct: number;
  controllerName?: string | null;
  onOpenDownloads: () => void;
  onOpenCommandPalette: () => void;
  onOpenAddCustomGame: () => void;
  onOpenStats: () => void;
  onOpenOnboarding: () => void;
  onOpenSettings: () => void;
  onOpenUltraFps: () => void;
  onOpenLaunchLogs: () => void;
}

export function TopStatusBar({
  currentTab,
  onTabChange,
  statusFilter,
  onStatusFilterChange,
  installedCount,
  cloudCount,
  favoritesCount,
  playerName,
  viewMode,
  onViewModeChange,
  scanning,
  onRescan,
  activeDownloadsCount,
  totalDownloadsCount,
  averageDownloadPct,
  controllerName,
  onOpenDownloads,
  onOpenCommandPalette,
  onOpenAddCustomGame,
  onOpenStats,
  onOpenOnboarding,
  onOpenSettings,
  onOpenUltraFps,
  onOpenLaunchLogs,
}: TopStatusBarProps) {
  return (
    <header className="h-16 max-w-[1480px] w-full mx-auto px-8 lg:px-12 flex items-center justify-between gap-3 shrink-0">
      {/* Sol: `sonsus-engine` minimalist amblem + Ana Sayfa & Kütüphane Sekmeleri */}
      <div className="flex items-center gap-5 shrink-0">
        <div
          onClick={() => onTabChange("home")}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-6 h-6 rounded-full border-[2px] border-white flex items-center justify-center relative overflow-hidden">
            <div className="w-2.5 h-2.5 rounded-full bg-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[16px] font-bold tracking-tight text-white hidden sm:inline">
            sonsus-engine
          </span>
        </div>

        {/* Ana Sayfa & Kütüphane Anahtarı */}
        <div className="flex items-center p-0.5 rounded-full bg-[#121218] border border-white/10">
          <button
            type="button"
            onClick={() => onTabChange("home")}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTab === "home"
                ? "bg-white text-black shadow-md shadow-white/10 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Ana Sayfa</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("library")}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTab === "library"
                ? "bg-white text-black shadow-md shadow-white/10 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>Kütüphane</span>
          </button>
        </div>
      </div>

      {/* Sağ: Pill navigasyon + Ctrl+K + Oyun Ekle + İstatistik + İndirmeler + Profil + Ayarlar */}
      <div className="flex items-center gap-1.5 text-[13px] overflow-x-auto no-scrollbar">
        <button
          onClick={() => onStatusFilterChange("all")}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer shrink-0 ${
            statusFilter === "all"
              ? "bg-[#17171c] text-white border border-white/15 shadow-sm"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          Kütüphane
        </button>

        <button
          onClick={() => onStatusFilterChange("installed")}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            statusFilter === "installed"
              ? "bg-[#17171c] text-white border border-white/15 shadow-sm"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          <span>Yüklü</span>
          <span className="text-[11px] text-zinc-300 font-medium tabular-nums">
            {installedCount}
          </span>
        </button>

        <button
          onClick={() => onStatusFilterChange("cloud")}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            statusFilter === "cloud"
              ? "bg-[#17171c] text-white border border-white/15 shadow-sm"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          <span>Bulutta</span>
          <span className="text-[11px] text-zinc-500 tabular-nums">{cloudCount}</span>
        </button>

        <button
          onClick={() =>
            onStatusFilterChange(statusFilter === "favorites" ? "all" : "favorites")
          }
          className={`px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            statusFilter === "favorites"
              ? "bg-white/10 text-white border border-white/20 shadow-sm"
              : "text-zinc-400 hover:text-white border border-transparent"
          }`}
        >
          <Heart
            className={`w-3.5 h-3.5 ${
              statusFilter === "favorites" ? "text-white fill-white" : ""
            }`}
          />
          <span>Favoriler</span>
          {favoritesCount > 0 && (
            <span className="text-[11px] text-zinc-400 font-medium tabular-nums">
              {favoritesCount}
            </span>
          )}
        </button>

        <div className="w-px h-4 bg-zinc-800 mx-1 shrink-0" />

        {/* Ctrl+K Hızlı Başlatma Paleti */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="h-8 px-2.5 rounded-full bg-[#121216] hover:bg-[#1c1c22] border border-white/[0.08] text-zinc-400 hover:text-white text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          title="Hızlı Oyun Başlatıcı (Ctrl+K)"
        >
          <Command className="w-3 h-3" />
          <span className="hidden xl:inline">Ctrl+K</span>
        </button>

        {/* Harici / Özel Oyun Ekle */}
        <button
          type="button"
          onClick={onOpenAddCustomGame}
          className="h-8 px-3 rounded-full bg-[#121216] hover:bg-[#1c1c22] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          title="Harici (.exe, .AppImage, .sh) Oyun Ekle"
        >
          <Plus className="w-3.5 h-3.5 text-zinc-300" />
          <span className="hidden xl:inline">Oyun Ekle</span>
        </button>

        {/* İstatistik Paneli */}
        <button
          type="button"
          onClick={onOpenStats}
          className="w-8 h-8 rounded-full bg-[#121216] hover:bg-[#1c1c22] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Kütüphane İstatistik Paneli"
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </button>

        {/* E-Spor Ultra FPS & Konsol Modu Pill Tuşları */}
        {controllerName && (
          <div
            className="h-8 px-2.5 rounded-full bg-white/[0.05] border border-white/10 flex items-center gap-1.5 text-xs text-zinc-300 shrink-0"
            title={`Oyun Kolu Bağlı: ${controllerName}`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-zinc-300" />
            <span className="font-medium text-[11px] hidden md:inline">Konsol Modu</span>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenUltraFps}
          className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-zinc-100 hover:text-white flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer shrink-0"
          title="⚡ CS2 & Linux E-Spor Ultra FPS Motoru"
        >
          <Zap className="w-3.5 h-3.5 text-zinc-300" />
          <span className="tracking-wide">Ultra FPS</span>
        </button>

        <button
          type="button"
          onClick={onOpenDownloads}
          className={`h-8 px-3 rounded-full border flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer shrink-0 ${
            activeDownloadsCount > 0
              ? "bg-white/15 border-white/30 text-white"
              : "bg-[#121216] hover:bg-[#1c1c22] border-white/[0.08] text-zinc-400 hover:text-white"
          }`}
          title="Uygulama İçi İndirme & Doğrulama Yöneticisi"
        >
          <Download
            className="w-3.5 h-3.5 text-zinc-400"
          />
          {activeDownloadsCount > 0 ? (
            <span className="tabular-nums">
              {activeDownloadsCount} • %{Math.round(averageDownloadPct)}
            </span>
          ) : totalDownloadsCount > 0 ? (
            <span className="tabular-nums">{totalDownloadsCount}</span>
          ) : null}
        </button>

        <button
          onClick={() => onViewModeChange(viewMode === "grid" ? "table" : "grid")}
          className="w-8 h-8 rounded-full bg-[#121216] hover:bg-[#1c1c22] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
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
          className="w-8 h-8 rounded-full bg-[#121216] hover:bg-[#1c1c22] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          title="Kütüphaneyi Yeniden Tara (R)"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin text-white" : ""}`} />
        </button>

        {/* Oyuncu Profili & Mağaza Hesapları (Giriş Ekranı) */}
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="h-8 px-3 rounded-full bg-[#14141b] hover:bg-[#1e1e28] border border-white/12 text-xs font-semibold text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          title="Giriş Ekranı ve Mağaza Hesapları (Steam / Epic / GOG)"
        >
          <User className="w-3.5 h-3.5 text-zinc-400" />
          <span className="max-w-[96px] truncate">
            {playerName || "Hesaplar"}
          </span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-full bg-[#17171c] hover:bg-[#222229] border border-white/12 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Sistem Hookları ve Kontrol Merkezi"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenLaunchLogs}
          className="w-8 h-8 rounded-full bg-[#121216] hover:bg-[#1c1c22] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Çalıştırma & Çökme Günlükleri"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
