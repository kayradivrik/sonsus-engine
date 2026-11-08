import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { tauriApi } from "../api/tauriClient";
import {
  LibraryQuickFilter,
  PageSizeOption,
  Platform,
  SortMode,
  UnifiedGame,
} from "../types/game";

export interface GenreCountItem {
  name: string;
  count: number;
}

export interface LibraryCounts {
  all: number;
  installed: number;
  cloud: number;
  favorites: number;
  hidden: number;
  steam: number;
  epic: number;
  gog: number;
  custom: number;
}

/**
 * Kütüphane verisini, filtreleri (Favoriler & Gizlenenler dahil), gecikmesiz (`useDeferredValue`) aramayı,
 * "Son Oynananlar" rafını, istatistikleri ve Sayfalamayı (Pagination) tek bir kancada yönetir.
 */
export function useLibrary(onError: (msg: string) => void) {
  const [games, setGames] = useState<UnifiedGame[]>([]);
  const [statusFilter, setStatusFilter] = useState<LibraryQuickFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("status");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(24);
  const [scanning, setScanning] = useState(false);

  const deferredQuery = useDeferredValue(query);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const performScan = useCallback(async () => {
    setScanning(true);
    try {
      const fresh = await tauriApi.scanAllLibraries();
      if (fresh && fresh.length > 0) {
        setGames(fresh);
      }
    } catch (err) {
      onErrorRef.current(`Tarama hatası: ${String(err)}`);
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Önce SQLite disk önbelleğindeki oyunları 5ms içinde anında yükle
    tauriApi
      .getCachedLibrary()
      .then((cached) => {
        if (isMounted && cached.length > 0) {
          setGames(cached);
        }
      })
      .catch(() => {});

    // Arayüzün kilitlenmesini veya donmasını önlemek için arka plan disk/ağ taramasını hafif gecikmeli başlat
    const timer = setTimeout(() => {
      if (isMounted) {
        performScan();
      }
    }, 1200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [performScan]);

  const replaceSingleGame = useCallback((updated: UnifiedGame) => {
    setGames((prev) => {
      const exists = prev.some((g) => g.id === updated.id);
      if (!exists) {
        return [...prev, updated].sort((a, b) =>
          a.title.toLowerCase().localeCompare(b.title.toLowerCase())
        );
      }
      return prev.map((g) => (g.id === updated.id ? updated : g));
    });
  }, []);

  const removeSingleGame = useCallback((gameId: string) => {
    setGames((prev) => prev.filter((g) => g.id !== gameId));
  }, []);

  const counts = useMemo<LibraryCounts>(() => {
    let visibleAll = 0;
    let installed = 0;
    let cloud = 0;
    let favorites = 0;
    let hidden = 0;
    let steam = 0;
    let epic = 0;
    let gog = 0;
    let custom = 0;

    for (const g of games) {
      if (g.is_hidden) {
        hidden++;
        continue;
      }
      visibleAll++;
      if (g.status === "installed") installed++;
      else cloud++;
      if (g.is_favorite) favorites++;

      if (g.platform === "steam") steam++;
      else if (g.platform === "epic") epic++;
      else if (g.platform === "gog") gog++;
      else custom++;
    }

    return {
      all: visibleAll,
      installed,
      cloud,
      favorites,
      hidden,
      steam,
      epic,
      gog,
      custom,
    };
  }, [games]);

  const recentGames = useMemo<UnifiedGame[]>(() => {
    return games
      .filter(
        (g) =>
          !g.is_hidden &&
          ((g.last_played_epoch && g.last_played_epoch > 0) ||
            g.playtime_minutes > 0)
      )
      .sort(
        (a, b) =>
          (b.last_played_epoch ?? 0) - (a.last_played_epoch ?? 0) ||
          b.playtime_minutes - a.playtime_minutes
      )
      .slice(0, 6);
  }, [games]);

  const genreCounts = useMemo<GenreCountItem[]>(() => {
    const map = new Map<string, number>();
    for (const g of games) {
      if (statusFilter === "hidden") {
        if (!g.is_hidden) continue;
      } else {
        if (g.is_hidden) continue;
        if (statusFilter === "favorites" && !g.is_favorite) continue;
        if (
          (statusFilter === "installed" || statusFilter === "cloud") &&
          g.status !== statusFilter
        )
          continue;
      }
      if (platformFilter !== "all" && g.platform !== platformFilter) continue;
      for (const genre of g.genres ?? []) {
        map.set(genre, (map.get(genre) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [games, statusFilter, platformFilter]);

  const collectionCounts = useMemo<GenreCountItem[]>(() => {
    const map = new Map<string, number>();
    for (const g of games) {
      if (g.is_hidden) continue;
      if (g.collection_tag) {
        const tag = g.collection_tag.trim();
        if (tag) {
          map.set(tag, (map.get(tag) ?? 0) + 1);
        }
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [games]);

  const filteredGames = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const list = games.filter((g) => {
      if (statusFilter === "hidden") {
        if (!g.is_hidden) return false;
      } else {
        if (g.is_hidden) return false;
        if (statusFilter === "favorites" && !g.is_favorite) return false;
        if (
          (statusFilter === "installed" || statusFilter === "cloud") &&
          g.status !== statusFilter
        ) {
          return false;
        }
      }

      if (platformFilter !== "all" && g.platform !== platformFilter) return false;
      if (genreFilter && !(g.genres ?? []).includes(genreFilter)) return false;
      if (collectionFilter && g.collection_tag !== collectionFilter) return false;

      if (q) {
        const inTitle = g.title.toLowerCase().includes(q);
        const inDev = (g.developer ?? "").toLowerCase().includes(q);
        const inTag = (g.collection_tag ?? "").toLowerCase().includes(q);
        if (!inTitle && !inDev && !inTag) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      // Favoriler eşit durumda hafif öncelik alır
      if (sortMode === "status") {
        if (Boolean(a.is_favorite) !== Boolean(b.is_favorite)) {
          return a.is_favorite ? -1 : 1;
        }
        if (a.status !== b.status) return a.status === "installed" ? -1 : 1;
        return a.title.localeCompare(b.title);
      }
      if (sortMode === "playtime") {
        return (
          b.playtime_minutes - a.playtime_minutes ||
          a.title.localeCompare(b.title)
        );
      }
      if (sortMode === "recent") {
        return (b.last_played_epoch ?? 0) - (a.last_played_epoch ?? 0);
      }
      if (sortMode === "size") {
        return (b.size_bytes ?? 0) - (a.size_bytes ?? 0);
      }
      return a.title.localeCompare(b.title);
    });

    return list;
  }, [games, statusFilter, platformFilter, genreFilter, deferredQuery, sortMode]);

  // Filtre, arama veya sayfa boyutu değiştiğinde 1. sayfaya dön
  useEffect(() => {
    setPage(1);
  }, [statusFilter, platformFilter, genreFilter, collectionFilter, deferredQuery, sortMode, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const paginatedGames = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGames.slice(start, start + pageSize);
  }, [filteredGames, currentPage, pageSize]);

  return {
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
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    scanning,
    performScan,
    replaceSingleGame,
    removeSingleGame,
  };
}
