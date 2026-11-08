import { useTranslation } from "../i18n/useTranslation";
import {
  BarChart3,
  Compass,
  Download,
  Gamepad2,
  HardDrive,
  Laptop,
  LayoutGrid,
  Library,
  List,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { AppNavTab, ViewMode } from "../types/game";
import { SonsusLogo } from "./ui/SonsusLogo";

interface TopStatusBarProps {
  currentTab: AppNavTab;
  onTabChange: (tab: AppNavTab) => void;
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
  onOpenStorageCleaner: () => void;
  onOpenVictusControl: () => void;
}

export function TopStatusBar({
  currentTab,
  onTabChange,
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
  onOpenStorageCleaner,
  onOpenVictusControl,
}: TopStatusBarProps) {
  const { t } = useTranslation();
  return (
    <header className="h-16 w-full max-w-[1920px] mx-auto px-6 sm:px-8 xl:px-12 2xl:px-16 flex items-center justify-between gap-4 shrink-0">
      {/* Sol: Yeni Vektörel Kinetik sonsus-engine Amblemi + Ana Sayfa & Kütüphane Sekmeleri */}
      <div className="flex items-center gap-6 shrink-0">
        <div
          onClick={() => onTabChange("home")}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <SonsusLogo size={28} />
          <span className="text-[17px] font-black tracking-tight text-white hidden sm:inline group-hover:text-zinc-200 transition-colors">
            sonsus-engine
          </span>
        </div>

        {/* Ana Sayfa & Kütüphane Anahtarı */}
        <div className="flex items-center p-0.5 rounded-full bg-zinc-950 border border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => onTabChange("home")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer outline-none ${currentTab === "home"
              ? "bg-white text-black shadow-md font-bold"
              : "text-zinc-400 hover:text-white"
              }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t.home}</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("library")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer outline-none ${currentTab === "library"
              ? "bg-white text-black shadow-md font-bold"
              : "text-zinc-400 hover:text-white"
              }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>{t.library}</span>
          </button>
        </div>
      </div>

      {/* Sağ: Sade, Rahat Araç Butonları */}
      <div className="flex items-center gap-2 text-xs shrink-0">
        {/* Hızlı Arama & Komut Paleti (Ctrl+K) */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="h-9 px-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs flex items-center gap-2 transition-all cursor-pointer outline-none"
          title={t.searchTitle}
        >
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden md:inline font-medium">{t.searchPlaceholder}</span>
          <span className="hidden lg:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 border border-white/10">
            Ctrl+K
          </span>
        </button>

        {/* Özel Oyun Ekle */}
        <button
          type="button"
          onClick={onOpenAddCustomGame}
          className="h-9 px-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer outline-none"
          title="Harici (.exe, .AppImage, .sh) Oyun Ekle"
        >
          <Plus className="w-3.5 h-3.5 text-zinc-300" />
          <span className="hidden md:inline">Oyun Ekle</span>
        </button>

        {/* Performans Modülü */}
        <button
          type="button"
          onClick={onOpenUltraFps}
          className="h-9 px-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer outline-none"
          title="Performans ve CS2 Ayarları"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
          <span>{t.performanceMode}</span>
        </button>

        {/* Oyun Kolu Durumu */}
        {controllerName && (
          <div
            className="h-9 px-3 rounded-full bg-zinc-900/80 border border-white/10 flex items-center gap-1.5 text-xs text-zinc-300"
            title={`Oyun Kolu Bağlı: ${controllerName}`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-zinc-300" />
            <span className="font-medium text-[11px] hidden xl:inline">Konsol</span>
          </div>
        )}

        {/* İndirmeler & Doğrulama */}
        <button
          type="button"
          onClick={onOpenDownloads}
          className={`h-9 px-3 rounded-full border flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer outline-none ${activeDownloadsCount > 0
            ? "bg-white text-black border-white font-bold shadow-md"
            : "bg-zinc-900/80 hover:bg-zinc-800 border-white/10 hover:border-white/20 text-zinc-300 hover:text-white"
            }`}
          title="Uygulama İçi İndirme & Doğrulama Yöneticisi"
        >
          <Download className="w-3.5 h-3.5" />
          {activeDownloadsCount > 0 ? (
            <span className="tabular-nums font-mono font-bold">
              %{Math.round(averageDownloadPct)}
            </span>
          ) : totalDownloadsCount > 0 ? (
            <span className="tabular-nums font-mono text-[11px] text-zinc-400">
              {totalDownloadsCount}
            </span>
          ) : null}
        </button>

        {/* Yalnızca Kütüphane Sekmesinde Görünüm Anahtarı */}
        {currentTab === "library" && (
          <button
            onClick={() => onViewModeChange(viewMode === "grid" ? "table" : "grid")}
            className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer outline-none"
            title={viewMode === "grid" ? "Liste görünümü" : "Poster görünümü"}
          >
            {viewMode === "grid" ? (
              <List className="w-3.5 h-3.5" />
            ) : (
              <LayoutGrid className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Kütüphaneyi Yeniden Tara */}
        <button
          onClick={onRescan}
          disabled={scanning}
          className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 outline-none"
          title="Kütüphaneyi Yeniden Tara (R)"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin text-white" : ""}`} />
        </button>

        {/* Disk & Shader Temizleyici */}
        <button
          type="button"
          onClick={onOpenStorageCleaner}
          className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer outline-none"
          title="Disk Alanı & Shader Temizleyici"
        >
          <HardDrive className="w-3.5 h-3.5" />
        </button>

        {/* HP Victus Donanım & Fan Kontrolü */}
        <button
          type="button"
          onClick={onOpenVictusControl}
          className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer outline-none"
          title="HP Victus Fan & Güç Kontrolü"
        >
          <Laptop className="w-3.5 h-3.5" />
        </button>

        {/* İstatistikler */}
        <button
          type="button"
          onClick={onOpenStats}
          className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer outline-none"
          title="Kütüphane İstatistik Paneli"
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </button>

        {/* Oyuncu Profili / Hesaplar */}
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="h-9 px-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-xs font-semibold text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer outline-none"
          title="Mağaza Hesapları (Steam / Epic / GOG)"
        >
          <User className="w-3.5 h-3.5 text-zinc-400" />
          <span className="max-w-[80px] truncate hidden sm:inline">
            {playerName || "Hesaplar"}
          </span>
        </button>

        {/* Ayarlar */}
        <button
          onClick={onOpenSettings}
          className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer outline-none"
          title="Ayarlar & Başlatma Günlükleri"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
