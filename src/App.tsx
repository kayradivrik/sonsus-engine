import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { tauriApi } from "./api/tauriClient";
import { FilterStrip } from "./components/FilterStrip";
import { GameDetailView } from "./components/GameDetailView";
import { GameTable } from "./components/GameTable";
import { SettingsModal } from "./components/SettingsModal";
import { TopStatusBar } from "./components/TopStatusBar";
import { VirtualGameGrid } from "./components/VirtualGameGrid";
import { useLibrary } from "./hooks/useLibrary";
import { useSmoothWheel } from "./hooks/useSmoothWheel";
import {
  AppSettings,
  SystemDiagnostics,
  UnifiedGame,
  ViewMode,
  createDefaultAppSettings,
} from "./types/game";

export default function App() {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  const {
    filteredGames,
    counts,
    genreCounts,
    statusFilter,
    setStatusFilter,
    platformFilter,
    setPlatformFilter,
    genreFilter,
    setGenreFilter,
    sortMode,
    setSortMode,
    query,
    setQuery,
    scanning,
    performScan,
    replaceSingleGame,
  } = useLibrary(showToast);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedGame, setSelectedGame] = useState<UnifiedGame | null>(null);
  const [autoOpenInstall, setAutoOpenInstall] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(
    createDefaultAppSettings
  );
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  // Kütüphane görünümünde 144Hz/180Hz ivmeli yumuşak tekerlek kaydırması
  useSmoothWheel(mainScrollRef, !selectedGame && !settingsOpen);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    tauriApi.getAppSettings().then(setSettings).catch(() => {});
    tauriApi.getSystemDiagnostics().then(setDiagnostics).catch(() => {});

    const unStart = listen<string>("game-started", (e) => {
      setRunningId(e.payload);
    });
    const unExit = listen<string>("game-exited", () => {
      setRunningId(null);
      showToast("Oyun kapandı, ekran çözünürlüğü ve süreçler geri yüklendi.");
    });

    return () => {
      unStart.then((f) => f());
      unExit.then((f) => f());
    };
  }, [showToast]);

  // Kütüphane kısayolları (`/`, `ESC`, `R`)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "/" && !inInput && !selectedGame && !settingsOpen) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (!selectedGame && inInput && query) {
          setQuery("");
          (e.target as HTMLElement).blur();
        }
      } else if (
        (e.key === "r" || e.key === "R") &&
        !inInput &&
        !settingsOpen &&
        !selectedGame
      ) {
        e.preventDefault();
        performScan();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [query, selectedGame, settingsOpen, performScan, setQuery]);

  const handleOpenDetail = useCallback(
    (game: UnifiedGame, openInstallImmediately = false) => {
      setAutoOpenInstall(openInstallImmediately);
      setSelectedGame(game);
    },
    []
  );

  const handleLaunch = useCallback(
    async (game: UnifiedGame) => {
      try {
        const updated = await tauriApi.launchGame(game, null);
        replaceSingleGame(updated);
        setSelectedGame((prev) => (prev?.id === updated.id ? updated : prev));
        showToast(`${game.title} başlatılıyor...`);
      } catch (err) {
        showToast(`Başlatılamadı: ${String(err)}`);
      }
    },
    [replaceSingleGame, showToast]
  );

  const handleGameUpdated = useCallback(
    (updated: UnifiedGame) => {
      replaceSingleGame(updated);
      setSelectedGame((prev) => (prev?.id === updated.id ? updated : prev));
    },
    [replaceSingleGame]
  );

  const handleSaveSettings = async (next: AppSettings) => {
    await tauriApi.updateAppSettings(next);
    setSettings(next);
    showToast("Ayarlar kaydedildi.");
    performScan();
  };

  return (
    <div className="h-screen w-screen bg-black text-zinc-100 flex flex-col overflow-hidden">
      {/* Kütüphane Görünümü (`hidden` ile kaydırma konumu ve çözülmüş poster önbelleği korunur) */}
      <div
        className={
          selectedGame
            ? "hidden"
            : "flex-1 min-h-0 flex flex-col overflow-hidden"
        }
      >
        <TopStatusBar
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          installedCount={counts.installed}
          cloudCount={counts.cloud}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          scanning={scanning}
          onRescan={performScan}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <FilterStrip
          query={query}
          onQueryChange={setQuery}
          searchInputRef={searchInputRef}
          statusFilter={statusFilter}
          platformFilter={platformFilter}
          onPlatformFilterChange={setPlatformFilter}
          genreFilter={genreFilter}
          onGenreFilterChange={setGenreFilter}
          genreCounts={genreCounts}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          visibleCount={filteredGames.length}
          counts={counts}
        />

        <main ref={mainScrollRef} className="flex-1 overflow-y-auto pb-14">
          <div className="max-w-[1480px] w-full mx-auto px-8 lg:px-12">
            {filteredGames.length === 0 ? (
              <div className="py-24 text-center text-sm text-zinc-500">
                Arama veya filtreyle eşleşen oyun bulunamadı.
              </div>
            ) : viewMode === "grid" ? (
              <VirtualGameGrid
                games={filteredGames}
                runningId={runningId}
                onOpenDetail={handleOpenDetail}
                onLaunch={handleLaunch}
              />
            ) : (
              <GameTable
                games={filteredGames}
                runningId={runningId}
                onOpenDetail={handleOpenDetail}
                onLaunch={handleLaunch}
              />
            )}
          </div>
        </main>
      </div>

      {/* Tam Ekran Sinematik Oyun Sayfası */}
      {selectedGame && (
        <GameDetailView
          game={selectedGame}
          autoOpenInstall={autoOpenInstall}
          isRunning={runningId === selectedGame.id}
          displays={diagnostics?.displays ?? []}
          onBack={() => {
            setSelectedGame(null);
            setAutoOpenInstall(false);
          }}
          onLaunch={handleLaunch}
          onGameUpdated={handleGameUpdated}
          onNotify={showToast}
        />
      )}

      {/* Tam Ekran Genel Ayarlar Görünümü */}
      <SettingsModal
        open={settingsOpen}
        settings={settings}
        diagnostics={diagnostics}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      {/* Bildirim Balonu */}
      {toastMsg && (
        <div className="fixed bottom-5 right-6 z-50 px-4 py-2.5 rounded-full bg-[#16161e] border border-white/15 text-xs text-zinc-100 shadow-2xl animate-fade-in">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
