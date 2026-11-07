import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { tauriApi } from "../api/tauriClient";
import { InstallStatus, Platform, SortMode, UnifiedGame } from "../types/game";

export interface GenreCountItem {
  name: string;
  count: number;
}

/**
 * Kütüphane verisini, filtreleri, gecikmesiz (`useDeferredValue`) aramayı
 * ve hesaplanmış istatistikleri tek bir temiz kancada (hook) yönetir.
 */
export function useLibrary(onError: (msg: string) => void) {
  const [games, setGames] = useState<UnifiedGame[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | InstallStatus>("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("status");
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);

  // Yazarken arayüzün kilitlenmemesi için arama metnini düşük öncelikli güncelle
  const deferredQuery = useDeferredValue(query);

  const performScan = useCallback(async () => {
    setScanning(true);
    try {
      const fresh = await tauriApi.scanAllLibraries();
      setGames(fresh);
    } catch (err) {
      onError(`Tarama hatası: ${String(err)}`);
    } finally {
      setScanning(false);
    }
  }, [onError]);

  useEffect(() => {
    tauriApi
      .getCachedLibrary()
      .then((cached) => {
        if (cached.length > 0) setGames(cached);
      })
      .catch(() => {});

    performScan();
  }, [performScan]);

  const replaceSingleGame = useCallback((updated: UnifiedGame) => {
    setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  }, []);

  const counts = useMemo(() => {
    let installed = 0;
    let cloud = 0;
    let steam = 0;
    let epic = 0;
    let gog = 0;

    for (const g of games) {
      if (g.status === "installed") installed++;
      else cloud++;
      if (g.platform === "steam") steam++;
      else if (g.platform === "epic") epic++;
      else gog++;
    }

    return { all: games.length, installed, cloud, steam, epic, gog };
  }, [games]);

  const genreCounts = useMemo<GenreCountItem[]>(() => {
    const map = new Map<string, number>();
    for (const g of games) {
      if (statusFilter !== "all" && g.status !== statusFilter) continue;
      if (platformFilter !== "all" && g.platform !== platformFilter) continue;
      for (const genre of g.genres ?? []) {
        map.set(genre, (map.get(genre) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [games, statusFilter, platformFilter]);

  const filteredGames = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const list = games.filter((g) => {
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (platformFilter !== "all" && g.platform !== platformFilter) return false;
      if (genreFilter && !(g.genres ?? []).includes(genreFilter)) return false;
      if (q && !g.title.toLowerCase().includes(q)) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sortMode === "status") {
        if (a.status !== b.status) return a.status === "installed" ? -1 : 1;
        return a.title.localeCompare(b.title);
      }
      if (sortMode === "playtime") {
        return b.playtime_minutes - a.playtime_minutes || a.title.localeCompare(b.title);
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

  return {
    games,
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
  };
}

