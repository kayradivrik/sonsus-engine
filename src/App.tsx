import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { tauriApi } from "./api/tauriClient";
import { AddCustomGameModal } from "./components/AddCustomGameModal";
import { CommandPaletteModal } from "./components/CommandPaletteModal";
import { DownloadsModal } from "./components/DownloadsModal";
import { FilterStrip } from "./components/FilterStrip";
import { GameDetailView } from "./components/GameDetailView";
import { GameTable } from "./components/GameTable";
import { HomeCategoryShelf } from "./components/HomeCategoryShelf";
import { HomeDealsSection } from "./components/HomeDealsSection";
import { HomeHeroSlider } from "./components/HomeHeroSlider";
import { GameContextMenu, ContextMenuPosition } from "./components/GameContextMenu";
import { QuickAccessOverlay } from "./components/QuickAccessOverlay";
import { LaunchLogsModal } from "./components/LaunchLogsModal";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { PaginationBar } from "./components/PaginationBar";
import { SettingsModal } from "./components/SettingsModal";
import { StatsModal } from "./components/StatsModal";
import { StorageCleanerModal } from "./components/StorageCleanerModal";
import { TopStatusBar } from "./components/TopStatusBar";
import { UltraFpsModal } from "./components/UltraFpsModal";
import { VictusControlModal } from "./components/VictusControlModal";
import { VirtualGameGrid } from "./components/VirtualGameGrid";
import { useGamepadNav } from "./hooks/useGamepadNav";
import { useLibrary } from "./hooks/useLibrary";
import { useSmoothWheel } from "./hooks/useSmoothWheel";
import {
  AppNavTab,
  AppSettings,
  DownloadTaskInfo,
  SystemDiagnostics,
  UnifiedGame,
  ViewMode,
  createDefaultAppSettings,
} from "./types/game";

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppNavTab>("home");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  const {
    games,
    recentGames,
    filteredGames,
    paginatedGames,
    counts,
    genreCounts,
    collectionCounts,
    statusFilter,
    setStatusFilter,
    platformFilter,
    setPlatformFilter,
    genreFilter,
    setGenreFilter,
    collectionFilter,
    setCollectionFilter,
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
    removeSingleGame,
  } = useLibrary(showToast);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedGame, setSelectedGame] = useState<UnifiedGame | null>(null);
  const [autoOpenInstall, setAutoOpenInstall] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [addCustomOpen, setAddCustomOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [isFirstRunOnboarding, setIsFirstRunOnboarding] = useState(false);
  const [ultraFpsOpen, setUltraFpsOpen] = useState(false);
  const [storageCleanerOpen, setStorageCleanerOpen] = useState(false);
  const [victusControlOpen, setVictusControlOpen] = useState(false);
  const [launchLogsOpen, setLaunchLogsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);

  const [downloadsMap, setDownloadsMap] = useState<Map<string, DownloadTaskInfo>>(
    () => new Map()
  );
  const [settings, setSettings] = useState<AppSettings>(
    createDefaultAppSettings
  );
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  const anyOverlayOpen =
    Boolean(selectedGame) ||
    settingsOpen ||
    downloadsOpen ||
    paletteOpen ||
    addCustomOpen ||
    statsOpen ||
    storageCleanerOpen ||
    victusControlOpen ||
    onboardingOpen ||
    ultraFpsOpen ||
    launchLogsOpen;

  // Kütüphane görünümünde 144Hz/180Hz ivmeli yumuşak tekerlek kaydırması
  useSmoothWheel(mainScrollRef, !anyOverlayOpen);

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

  const handleToggleFavorite = useCallback(
    async (game: UnifiedGame) => {
      try {
        const nextFav = !game.is_favorite;
        const updated = await tauriApi.setGamePreferences(
          game,
          nextFav,
          Boolean(game.is_hidden),
          game.collection_tag ?? null
        );
        handleGameUpdated(updated);
      } catch (err) {
        showToast(String(err));
      }
    },
    [handleGameUpdated, showToast]
  );

  const handleToggleHide = useCallback(
    async (game: UnifiedGame) => {
      try {
        const nextHide = !game.is_hidden;
        const updated = await tauriApi.setGamePreferences(
          game,
          Boolean(game.is_favorite),
          nextHide,
          game.collection_tag ?? null
        );
        handleGameUpdated(updated);
        showToast(
          nextHide
            ? `${game.title} kütüphaneden gizlendi.`
            : `${game.title} gizliliği kaldırıldı.`
        );
      } catch (err) {
        showToast(String(err));
      }
    },
    [handleGameUpdated, showToast]
  );

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    tauriApi
      .getAppSettings()
      .then((loaded) => {
        setSettings(loaded);
        if (!loaded.onboarding_completed) {
          setIsFirstRunOnboarding(true);
          setOnboardingOpen(true);
        }
      })
      .catch(() => {});

    tauriApi.getSystemDiagnostics().then(setDiagnostics).catch(() => {});
    const refreshDownloads = () => {
      tauriApi
        .getActiveDownloads()
        .then((list) => {
          setDownloadsMap((prev) => {
            const next = new Map(prev);
            // Güncel steam veya dahili indirmeleri eşitle
            for (const item of list) {
              next.set(item.game_id, item);
            }
            // Artık var olmayan steam indirmelerini temizle
            const currentIds = new Set(list.map((l) => l.game_id));
            for (const [k, v] of next.entries()) {
              if (v.platform === "steam" && !currentIds.has(k)) {
                next.delete(k);
              }
            }
            return next;
          });
        })
        .catch(() => {});
    };

    refreshDownloads();
    const dlInterval = setInterval(refreshDownloads, 2000);

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
          info.detail_text || `${info.title} işlemi başarıyla tamamlandı!`
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
      clearInterval(dlInterval);
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

  // Kütüphane kısayolları (`Ctrl+K`, `/`, `ESC`, `R`)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "F12") {
        e.preventDefault();
        setQuickAccessOpen((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (!onboardingOpen) {
          setPaletteOpen((prev) => !prev);
        }
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "/" && !inInput && !anyOverlayOpen) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        if (paletteOpen) {
          setPaletteOpen(false);
        } else if (addCustomOpen) {
          setAddCustomOpen(false);
        } else if (statsOpen) {
          setStatsOpen(false);
        } else if (storageCleanerOpen) {
          setStorageCleanerOpen(false);
        } else if (victusControlOpen) {
          setVictusControlOpen(false);
        } else if (downloadsOpen) {
          setDownloadsOpen(false);
        } else if (onboardingOpen && !isFirstRunOnboarding) {
          setOnboardingOpen(false);
        } else if (settingsOpen) {
          setSettingsOpen(false);
        } else if (!selectedGame && inInput && query) {
          setQuery("");
          (e.target as HTMLElement).blur();
        }
      } else if ((e.key === "r" || e.key === "R") && !inInput && !anyOverlayOpen) {
        e.preventDefault();
        performScan();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    query,
    anyOverlayOpen,
    paletteOpen,
    addCustomOpen,
    statsOpen,
    downloadsOpen,
    onboardingOpen,
    isFirstRunOnboarding,
    settingsOpen,
    selectedGame,
    performScan,
    setQuery,
  ]);

  const handleOpenDetail = useCallback(
    (game: UnifiedGame, openInstallImmediately = false) => {
      setAutoOpenInstall(openInstallImmediately);
      setSelectedGame(game);
    },
    []
  );

  const handleOpenDetailDefault = useCallback(
    (game: UnifiedGame) => {
      handleOpenDetail(game, false);
    },
    [handleOpenDetail]
  );

  const handleContextMenu = useCallback((game: UnifiedGame, x: number, y: number) => {
    setContextMenu({ x, y, game });
  }, []);

  const handleCreateShortcut = useCallback(async (game: UnifiedGame) => {
    try {
      const msg = await tauriApi.createDesktopShortcut(game);
      showToast(msg);
    } catch (e: any) {
      showToast(`Hata: ${e}`);
    }
  }, [showToast]);

  const handleOpenFolder = useCallback(async (game: UnifiedGame) => {
    try {
      await tauriApi.openGameInstallDir(game);
    } catch (e: any) {
      showToast(`Klasör açılamadı: ${e}`);
    }
  }, [showToast]);

  const handleCleanPrefix = useCallback(async (game: UnifiedGame) => {
    try {
      const msg = await tauriApi.cleanGamePrefix(game.id);
      showToast(msg);
    } catch (e: any) {
      showToast(`Hata: ${e}`);
    }
  }, [showToast]);

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

  const gamesRef = useRef(games);
  gamesRef.current = games;
  const handleLaunchRef = useRef(handleLaunch);
  handleLaunchRef.current = handleLaunch;

  // Sistem tepsisinden doğrudan oyun başlatma dinleyicisi
  useEffect(() => {
    const unlisten = listen<string>("tray-launch-game", (e) => {
      const target = gamesRef.current.find((g) => g.id === e.payload);
      if (target) {
        handleLaunchRef.current(target);
      }
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleSaveSettings = async (next: AppSettings) => {
    await tauriApi.updateAppSettings(next);
    setSettings(next);
    tauriApi.getSystemDiagnostics().then(setDiagnostics).catch(() => {});
    showToast("Ayarlar kaydedildi.");
    performScan();
  };

  const handleCompleteOnboarding = async (
    next: AppSettings,
    shouldRescan: boolean
  ) => {
    await tauriApi.updateAppSettings(next);
    setSettings(next);
    setOnboardingOpen(false);
    setIsFirstRunOnboarding(false);
    if (shouldRescan) {
      performScan();
    }
  };

  const handleNextStore = useCallback(() => {
    const stores: ("all" | import("./types/game").Platform)[] = ["all", "steam", "epic", "gog"];
    setPlatformFilter((prev) => {
      const idx = stores.indexOf(prev);
      return stores[(idx + 1) % stores.length];
    });
  }, [setPlatformFilter]);

  const handlePrevStore = useCallback(() => {
    const stores: ("all" | import("./types/game").Platform)[] = ["all", "steam", "epic", "gog"];
    setPlatformFilter((prev) => {
      const idx = stores.indexOf(prev);
      return stores[(idx - 1 + stores.length) % stores.length];
    });
  }, [setPlatformFilter]);

  // Gamepad / Oyun Kolu Navigasyonu Kancası
  const { controllerName, selectedIndex } = useGamepadNav({
    games: paginatedGames,
    enabled: !anyOverlayOpen,
    onSelectGame: (g) => handleOpenDetail(g, false),
    onLaunchGame: (g) => handleLaunch(g),
    onOpenCommandPalette: () => setPaletteOpen(true),
    onNextStore: handleNextStore,
    onPrevStore: handlePrevStore,
  });

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
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          playerName={settings.player_name}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          scanning={scanning}
          onRescan={performScan}
          activeDownloadsCount={activeDownloads.length}
          totalDownloadsCount={downloadList.length}
          averageDownloadPct={averageDownloadPct}
          controllerName={controllerName}
          onOpenDownloads={() => setDownloadsOpen(true)}
          onOpenCommandPalette={() => setPaletteOpen(true)}
          onOpenAddCustomGame={() => setAddCustomOpen(true)}
          onOpenStats={() => setStatsOpen(true)}
          onOpenOnboarding={() => {
            setIsFirstRunOnboarding(false);
            setOnboardingOpen(true);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenUltraFps={() => setUltraFpsOpen(true)}
          onOpenStorageCleaner={() => setStorageCleanerOpen(true)}
          onOpenVictusControl={() => setVictusControlOpen(true)}
        />

        {/* Filtre Şeridi (Kütüphane sekmesinde veya Arama yapıldığında görünür) */}
        {currentTab === "library" && (
          <FilterStrip
            query={query}
            onQueryChange={setQuery}
            searchInputRef={searchInputRef}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            platformFilter={platformFilter}
            onPlatformFilterChange={setPlatformFilter}
            genreFilter={genreFilter}
            onGenreFilterChange={setGenreFilter}
            genreCounts={genreCounts}
            collectionFilter={collectionFilter}
            onCollectionFilterChange={setCollectionFilter}
            collectionCounts={collectionCounts}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            visibleCount={filteredGames.length}
            counts={counts}
          />
        )}

        <main ref={mainScrollRef} className="flex-1 overflow-y-auto pb-14">
          <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-8 xl:px-12 2xl:px-16">
            {currentTab === "home" ? (
              <>
                {/* 1. Büyük Sinematik Öne Çıkanlar Slider'ı */}
                <HomeHeroSlider
                  games={games}
                  onOpenDetail={handleOpenDetailDefault}
                  onLaunch={handleLaunch}
                />

                {/* 2. Canlı Fırsatlar & İndirimler & Haftalık Ücretsiz Oyunlar */}
                <HomeDealsSection />

                {/* 3. Epic Games Tarzı Kategorize Raflar */}
                {recentGames.length > 0 && (
                  <HomeCategoryShelf
                    title="Son Oynananlar & Hızlı Başlat"
                    badgeIcon="⚡"
                    games={recentGames}
                    runningId={runningId}
                    onOpenDetail={handleOpenDetailDefault}
                    onLaunch={handleLaunch}
                    onToggleFavorite={handleToggleFavorite}
                    onContextMenu={handleContextMenu}
                  />
                )}

                {/* Aksiyon & Nişancı Kategorisi */}
                <HomeCategoryShelf
                  title="Aksiyon & Nişancı Oyunları"
                  badgeIcon="🔥"
                  games={games.filter((g) =>
                    g.genres?.some((genre) =>
                      ["action", "shooter", "aksiyon", "nişancı"].some((k) =>
                        genre.toLowerCase().includes(k)
                      )
                    )
                  )}
                  runningId={runningId}
                  onOpenDetail={handleOpenDetailDefault}
                  onLaunch={handleLaunch}
                  onToggleFavorite={handleToggleFavorite}
                  onContextMenu={handleContextMenu}
                  onViewCategoryAll={() => {
                    setGenreFilter("Action");
                    setCurrentTab("library");
                  }}
                />

                {/* Macera & RPG Kategorisi */}
                <HomeCategoryShelf
                  title="Macera & Rol Yapma (RPG)"
                  badgeIcon="🗡️"
                  games={games.filter((g) =>
                    g.genres?.some((genre) =>
                      ["adventure", "rpg", "macera", "rol yapma"].some((k) =>
                        genre.toLowerCase().includes(k)
                      )
                    )
                  )}
                  runningId={runningId}
                  onOpenDetail={handleOpenDetailDefault}
                  onLaunch={handleLaunch}
                  onToggleFavorite={handleToggleFavorite}
                  onContextMenu={handleContextMenu}
                  onViewCategoryAll={() => {
                    setGenreFilter("Adventure");
                    setCurrentTab("library");
                  }}
                />

                {/* Bağımsız / Indie Kategorisi */}
                <HomeCategoryShelf
                  title="Seçkin Bağımsız (Indie) Yapımlar"
                  badgeIcon="🎨"
                  games={games.filter((g) =>
                    g.genres?.some((genre) =>
                      ["indie", "bağımsız"].some((k) =>
                        genre.toLowerCase().includes(k)
                      )
                    )
                  )}
                  runningId={runningId}
                  onOpenDetail={handleOpenDetailDefault}
                  onLaunch={handleLaunch}
                  onToggleFavorite={handleToggleFavorite}
                  onContextMenu={handleContextMenu}
                  onViewCategoryAll={() => {
                    setGenreFilter("Indie");
                    setCurrentTab("library");
                  }}
                />
              </>
            ) : (
              <>
                {filteredGames.length === 0 ? (
                  <div className="py-24 text-center text-sm text-zinc-500">
                    Arama veya filtreyle eşleşen oyun bulunamadı.
                  </div>
                ) : viewMode === "grid" ? (
                  <VirtualGameGrid
                    games={paginatedGames}
                    runningId={runningId}
                    downloadsById={downloadsMap}
                    focusedIndex={controllerName ? selectedIndex : undefined}
                    onOpenDetail={handleOpenDetail}
                    onLaunch={handleLaunch}
                    onToggleFavorite={handleToggleFavorite}
                    onContextMenu={handleContextMenu}
                  />
                ) : (
                  <GameTable
                    games={paginatedGames}
                    runningId={runningId}
                    onOpenDetail={handleOpenDetail}
                    onLaunch={handleLaunch}
                    onToggleFavorite={handleToggleFavorite}
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
              </>
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
          downloadTask={downloadsMap.get(selectedGame.id)}
          displays={diagnostics?.displays ?? []}
          runners={diagnostics?.runners ?? []}
          onBack={() => {
            setSelectedGame(null);
            setAutoOpenInstall(false);
          }}
          onLaunch={handleLaunch}
          onGameUpdated={handleGameUpdated}
          onGameRemoved={removeSingleGame}
          onNotify={showToast}
        />
      )}

      {/* Tam Ekran Genel Ayarlar Görünümü */}
      <SettingsModal
        open={settingsOpen}
        settings={settings}
        diagnostics={diagnostics}
        onClose={() => setSettingsOpen(false)}
        onOpenOnboarding={() => {
          setIsFirstRunOnboarding(false);
          setOnboardingOpen(true);
        }}
        onSave={handleSaveSettings}
      />

      {/* Uygulama İçi İndirme & Doğrulama Yöneticisi */}
      <DownloadsModal
        open={downloadsOpen}
        tasks={downloadList}
        gamesById={gamesById}
        onClose={() => setDownloadsOpen(false)}
        onNotify={showToast}
      />

      {/* Ctrl+K Hızlı Başlatma Paleti */}
      <CommandPaletteModal
        open={paletteOpen}
        games={games}
        onClose={() => setPaletteOpen(false)}
        onLaunch={handleLaunch}
        onOpenDetail={handleOpenDetail}
      />

      {/* Harici / Özel Oyun Ekleme Penceresi */}
      <AddCustomGameModal
        open={addCustomOpen}
        onClose={() => setAddCustomOpen(false)}
        onGameAdded={(created) => {
          replaceSingleGame(created);
        }}
        onNotify={showToast}
      />

      {/* Kütüphane İstatistik & Analiz Paneli */}
      <StatsModal
        open={statsOpen}
        games={games}
        playerName={settings.player_name}
        onClose={() => setStatsOpen(false)}
        onOpenDetail={(g) => handleOpenDetail(g, false)}
      />

      {/* Sinematik Giriş / Karşılama & Mağaza Hesapları Ekranı */}
      <OnboardingScreen
        open={onboardingOpen}
        isFirstRun={isFirstRunOnboarding}
        settings={settings}
        totalGamesCount={counts.all}
        onComplete={handleCompleteOnboarding}
        onClose={() => setOnboardingOpen(false)}
        onNotify={showToast}
      />

      {/* ⚡ E-Spor & CS2 Ultra FPS Motoru Modal */}
      {ultraFpsOpen && (
        <UltraFpsModal onClose={() => setUltraFpsOpen(false)} />
      )}

      {/* 🧹 Disk Alanı Analizcisi & Shader Temizleyici Modal */}
      {storageCleanerOpen && (
        <StorageCleanerModal
          onClose={() => setStorageCleanerOpen(false)}
          showToast={showToast}
        />
      )}

      {/* 💻 HP Victus Fan & Donanım Güç Kontrolü Modal */}
      {victusControlOpen && (
        <VictusControlModal
          onClose={() => setVictusControlOpen(false)}
          showToast={showToast}
        />
      )}

      {/* 📋 Canlı Çalıştırma & Çökme Günlükleri Modal */}
      {launchLogsOpen && (
        <LaunchLogsModal onClose={() => setLaunchLogsOpen(false)} />
      )}

      {/* Oyun Kartı Sağ Tık Menüsü */}
      <GameContextMenu
        position={contextMenu}
        onClose={() => setContextMenu(null)}
        onLaunch={handleLaunch}
        onOpenDetail={(g) => handleOpenDetail(g, false)}
        onToggleFavorite={handleToggleFavorite}
        onToggleHide={handleToggleHide}
        onCreateShortcut={handleCreateShortcut}
        onOpenFolder={handleOpenFolder}
        onCleanPrefix={handleCleanPrefix}
      />

      {/* Oyun İçi Hızlı Erişim / Steam Deck Menüsü (Shift + F12) */}
      <QuickAccessOverlay
        open={quickAccessOpen}
        onClose={() => setQuickAccessOpen(false)}
        runningGameTitle={runningId ? gamesById.get(runningId)?.title : null}
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
