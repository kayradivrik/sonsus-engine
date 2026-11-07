import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { tauriApi } from "./api/tauriClient";
import { DownloadsModal } from "./components/DownloadsModal";
import { FilterStrip } from "./components/FilterStrip";
import { GameDetailView } from "./components/GameDetailView";
import { GameTable } from "./components/GameTable";
import { PaginationBar } from "./components/PaginationBar";
import { SettingsModal } from "./components/SettingsModal";
import { TopStatusBar } from "./components/TopStatusBar";
import { VirtualGameGrid } from "./components/VirtualGameGrid";
import { useLibrary } from "./hooks/useLibrary";
import { useSmoothWheel } from "./hooks/useSmoothWheel";
import {
  AppSettings,
  DownloadTaskInfo,
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
    games,
    filteredGames,
    paginatedGames,
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
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    scanning,
    performScan,
    replaceSingleGame,
  } = useLibrary(showToast);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedGame, setSelectedGame] = useState<UnifiedGame | null>(null);
  const [autoOpenInstall, setAutoOpenInstall] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [downloadsMap, setDownloadsMap] = useState<Map<string, DownloadTaskInfo>>(
    () => new Map()
  );
  const [settings, setSettings] = useState<AppSettings>(
    createDefaultAppSettings
  );
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  // Kütüphane görünümünde 144Hz/180Hz ivmeli yumuşak tekerlek kaydırması
  useSmoothWheel(
    mainScrollRef,
    !selectedGame && !settingsOpen && !downloadsOpen
  );

  const gamesById = useMemo(() => {
    const map = new Map<string, UnifiedGame>();
    for (const g of games) map.set(g.id, g);
    return map;
  }, [games]);

  const downloadList = useMemo(
    () => Array.from(downloadsMap.values()),
    [downloadsMap]
  );

  const activeDownloads = useMemo(
    () => downloadList.filter((t) => t.status === "downloading"),
    [downloadList]
  );

  const averageDownloadPct = useMemo(() => {
    if (activeDownloads.length === 0) return 0;
    const sum = activeDownloads.reduce((acc, t) => acc + t.progress_percent, 0);
    return sum / activeDownloads.length;
  }, [activeDownloads]);

  const handleGameUpdated = useCallback(
    (updated: UnifiedGame) => {
      replaceSingleGame(updated);
      setSelectedGame((prev) => (prev?.id === updated.id ? updated : prev));
    },
    [replaceSingleGame]
  );

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    tauriApi.getAppSettings().then(setSettings).catch(() => {});
    tauriApi.getSystemDiagnostics().then(setDiagnostics).catch(() => {});
    tauriApi
      .getActiveDownloads()
      .then((list) => {
        const next = new Map<string, DownloadTaskInfo>();
        for (const item of list) next.set(item.game_id, item);
        setDownloadsMap(next);
      })
      .catch(() => {});

    const unStart = listen<string>("game-started", (e) => {
      setRunningId(e.payload);
    });
    const unExit = listen<string>("game-exited", () => {
      setRunningId(null);
      showToast("Oyun kapandı, ekran çözünürlüğü ve süreçler geri yüklendi.");
    });
    const unDlUpdate = listen<DownloadTaskInfo>("download-updated", (e) => {
      const info = e.payload;
      setDownloadsMap((prev) => {
        const next = new Map(prev);
        next.set(info.game_id, info);
        return next;
      });
      if (info.status === "completed" && info.updated_game) {
        handleGameUpdated(info.updated_game);
        showToast(
          `${info.title} indirmesi tamamlandı ve Yüklü olarak işaretlendi!`
        );
      }
    });
    const unDlRemove = listen<string>("download-removed", (e) => {
      setDownloadsMap((prev) => {
        const next = new Map(prev);
        next.delete(e.payload);
        return next;
      });
    });

    return () => {
      unStart.then((f) => f());
      unExit.then((f) => f());
      unDlUpdate.then((f) => f());
      unDlRemove.then((f) => f());
    };
  }, [showToast, handleGameUpdated]);

  // Sayfa numarası değiştiğinde kütüphane listesini en üste taşı
  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setPage]
  );

  // Kütüphane kısayolları (`/`, `ESC`, `R`)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (
        e.key === "/" &&
        !inInput &&
        !selectedGame &&
        !settingsOpen &&
        !downloadsOpen
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        if (downloadsOpen) {
          setDownloadsOpen(false);
        } else if (settingsOpen) {
          setSettingsOpen(false);
        } else if (!selectedGame && inInput && query) {
          setQuery("");
          (e.target as HTMLElement).blur();
        }
      } else if (
        (e.key === "r" || e.key === "R") &&
        !inInput &&
        !settingsOpen &&
        !downloadsOpen &&
        !selectedGame
      ) {
        e.preventDefault();
        performScan();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [query, selectedGame, settingsOpen, downloadsOpen, performScan, setQuery]);

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

  const handleSaveSettings = async (next: AppSettings) => {
    await tauriApi.updateAppSettings(next);
    setSettings(next);
    tauriApi.getSystemDiagnostics().then(setDiagnostics).catch(() => {});
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
          activeDownloadsCount={activeDownloads.length}
          totalDownloadsCount={downloadList.length}
          averageDownloadPct={averageDownloadPct}
          onOpenDownloads={() => setDownloadsOpen(true)}
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
                games={paginatedGames}
                runningId={runningId}
                downloadsById={downloadsMap}
                onOpenDetail={handleOpenDetail}
                onLaunch={handleLaunch}
              />
            ) : (
              <GameTable
                games={paginatedGames}
                runningId={runningId}
                onOpenDetail={handleOpenDetail}
                onLaunch={handleLaunch}
              />
            )}

            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalItems={filteredGames.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={setPageSize}
            />
          </div>
        </main>
      </div>

      {/* Tam Ekran Sinematik Oyun Sayfası */}
      {selectedGame && (
        <GameDetailView
          game={selectedGame}
          autoOpenInstall={autoOpenInstall}
          isRunning={runningId === selectedGame.id}
          downloadTask={downloadsMap.get(selectedGame.id)}
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

      {/* Uygulama İçi İndirme Yöneticisi */}
      <DownloadsModal
        open={downloadsOpen}
        tasks={downloadList}
        gamesById={gamesById}
        onClose={() => setDownloadsOpen(false)}
        onNotify={showToast}
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
