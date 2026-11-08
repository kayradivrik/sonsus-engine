import { useTranslation } from "../i18n/useTranslation";
import { RefObject, useRef } from "react";
import { ChevronLeft, ChevronRight, EyeOff, Heart, Search, X } from "lucide-react";
import { GenreCountItem, LibraryCounts } from "../hooks/useLibrary";
import { LibraryQuickFilter, Platform, SortMode } from "../types/game";
import { CustomSelect, SelectOption } from "./ui/CustomSelect";

interface FilterStripProps {
  query: string;
  onQueryChange: (q: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  statusFilter: LibraryQuickFilter;
  onStatusFilterChange: (s: LibraryQuickFilter) => void;
  platformFilter: "all" | Platform;
  onPlatformFilterChange: (p: "all" | Platform) => void;
  genreFilter: string | null;
  onGenreFilterChange: (g: string | null) => void;
  genreCounts: GenreCountItem[];
  collectionFilter?: string | null;
  onCollectionFilterChange?: (c: string | null) => void;
  collectionCounts?: GenreCountItem[];
  sortMode: SortMode;
  onSortModeChange: (m: SortMode) => void;
  visibleCount: number;
  counts: LibraryCounts;
}

const GENRE_TR_MAP: Record<string, string> = {
  Action: "Aksiyon",
  Adventure: "Macera",
  Indie: "Bağımsız (Indie)",
  Shooter: "Nişancı",
  Horror: "Korku",
  Simulation: "Simülasyon",
  Strategy: "Strateji",
  RPG: "RPG / Rol Yapma",
  Racing: "Yarış",
  Sports: "Spor",
  Puzzle: "Bulmaca",
  Casual: "Gündelik",
  Anime: "Anime",
  Platformer: "Platform",
  Survival: "Hayatta Kalma",
};

export function FilterStrip({
  query,
  onQueryChange,
  searchInputRef,
  statusFilter,
  onStatusFilterChange,
  platformFilter,
  onPlatformFilterChange,
  genreFilter,
  onGenreFilterChange,
  genreCounts,
  collectionFilter,
  onCollectionFilterChange,
  collectionCounts = [],
  sortMode,
  onSortModeChange,
  visibleCount,
  counts,
}: FilterStripProps) {
  const { t, lang } = useTranslation();
  const pillScrollRef = useRef<HTMLDivElement>(null);

  const sortOptions: SelectOption<SortMode>[] = [
    { value: "status", label: t.sortByInstalled },
    { value: "title", label: t.sortByTitle },
    { value: "playtime", label: t.sortByPlaytime },
    { value: "recent", label: t.sortByRecent },
    { value: "size", label: t.sortBySize },
  ];

  const scrollPills = (delta: number) => {
    pillScrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  const stores: { key: "all" | Platform; label: string; count: number }[] = [
    { key: "all", label: t.all, count: counts.all },
    { key: "steam", label: "Steam", count: counts.steam },
    { key: "epic", label: "Epic", count: counts.epic },
    { key: "gog", label: "GOG", count: counts.gog },
    ...(counts.custom > 0 || platformFilter === "custom"
      ? [{ key: "custom" as const, label: t.storeCustom, count: counts.custom }]
      : []),
  ];

  return (
    <section className="w-full max-w-[1920px] mx-auto px-6 sm:px-8 xl:px-12 2xl:px-16 pt-3 pb-6 shrink-0">
      {/* 1. Satır: Başlık + Durum Kapsülleri (Yüklü/Bulut/Favori) + Sıralama Menüsü & Sayaç */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-none">
            {t.library}
          </h1>

          {/* Kütüphane İçi Hızlı Durum Filtre Kapsülleri */}
          <div className="h-9 rounded-full bg-zinc-950 border border-white/10 p-0.5 flex items-center gap-0.5 shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => onStatusFilterChange("all")}
              className={`h-full px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer outline-none ${
                statusFilter === "all"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>{t.all}</span>
              <span className="text-[10px] ml-1.5 opacity-60 tabular-nums">
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onStatusFilterChange("installed")}
              className={`h-full px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer outline-none ${
                statusFilter === "installed"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>{t.installed}</span>
              <span className="text-[10px] ml-1.5 opacity-60 tabular-nums">
                {counts.installed}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onStatusFilterChange("cloud")}
              className={`h-full px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer outline-none ${
                statusFilter === "cloud"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>{t.cloud}</span>
              <span className="text-[10px] ml-1.5 opacity-60 tabular-nums">
                {counts.cloud}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                onStatusFilterChange(
                  statusFilter === "favorites" ? "all" : "favorites"
                )
              }
              className={`h-full px-3.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer outline-none ${
                statusFilter === "favorites"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  statusFilter === "favorites" ? "fill-black" : ""
                }`}
              />
              <span>{t.favorites}</span>
              {counts.favorites > 0 && (
                <span className="text-[10px] opacity-60 tabular-nums">
                  {counts.favorites}
                </span>
              )}
            </button>
          </div>

          {(counts.hidden > 0 || statusFilter === "hidden") && (
            <button
              type="button"
              onClick={() =>
                onStatusFilterChange(statusFilter === "hidden" ? "all" : "hidden")
              }
              className={`h-8 px-3 rounded-full text-[11px] font-medium flex items-center gap-1.5 border cursor-pointer transition-colors outline-none ${
                statusFilter === "hidden"
                  ? "bg-white text-black border-white font-semibold"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border-white/10"
              }`}
              title={lang === "en" ? "Show / hide hidden games" : "Gizlenen oyunları göster / gizle"}
            >
              <EyeOff className="w-3 h-3" />
              <span>{lang === "en" ? `Hidden (${counts.hidden})` : `Gizlenenler (${counts.hidden})`}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <CustomSelect
            compact
            value={sortMode}
            options={sortOptions}
            onChange={onSortModeChange}
            className="w-48"
          />
          <span className="text-xs font-medium text-zinc-400 tabular-nums">
            {visibleCount.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")} {t.itemsCount}
          </span>
        </div>
      </div>

      {/* 2. Satır: Arama Kutusu + Mağaza Seçici + Kategori / Tür Şeridi */}
      <div className="mt-4 flex items-center gap-3">
        {/* Premium Neon/Glow Arama Kutusu */}
        <div className="group relative flex items-center w-60 sm:w-72 shrink-0 transition-all focus-within:w-72 sm:focus-within:w-80">
          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none blur-sm" />
          <Search className="w-4 h-4 text-zinc-400 group-focus-within:text-cyan-400 absolute left-3.5 pointer-events-none transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full h-9.5 rounded-full bg-zinc-900/90 hover:bg-zinc-900 border border-white/10 group-focus-within:border-cyan-500/50 pl-10 pr-9 text-xs font-medium text-zinc-100 placeholder:text-zinc-500 outline-none transition-all shadow-inner group-focus-within:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
          />
          {query ? (
            <button
              onClick={() => onQueryChange("")}
              className="absolute right-2.5 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer outline-none transition-colors"
              title={lang === "tr" ? "Temizle" : "Clear"}
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <span className="hidden sm:inline-block absolute right-3 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5 pointer-events-none">
              /
            </span>
          )}
        </div>

        {/* Mağaza Seçici Segmenti */}
        <div className="h-9 rounded-full bg-zinc-950 border border-white/10 p-0.5 flex items-center gap-0.5 shrink-0">
          {stores.map((st) => {
            const active = platformFilter === st.key;
            return (
              <button
                key={st.key}
                onClick={() =>
                  onPlatformFilterChange(
                    active && st.key !== "all" ? "all" : st.key
                  )
                }
                className={`h-full px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer outline-none ${
                  active
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <span>{st.label}</span>
                {st.key !== "all" && (
                  <span className="text-[10px] tabular-nums text-zinc-500">
                    {st.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Yatay Kaydırılabilir Kategori Pill Şeridi */}
        <div className="relative flex-1 min-w-0 flex items-center">
          <div
            ref={pillScrollRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-16"
          >
            {collectionCounts.map((c) => {
              const active = collectionFilter === c.name;
              return (
                <button
                  key={`col-${c.name}`}
                  onClick={() => onCollectionFilterChange?.(active ? null : c.name)}
                  className={`h-8 px-3.5 rounded-full border text-xs whitespace-nowrap flex items-center gap-1.5 shrink-0 transition-all duration-150 cursor-pointer outline-none ${
                    active
                      ? "border-white/40 bg-white/15 text-white font-medium"
                      : "border-white/[0.08] bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
                  }`}
                >
                  <span>{c.name}</span>
                  <span className={active ? "text-zinc-200" : "text-zinc-500"}>
                    {c.count}
                  </span>
                </button>
              );
            })}

            {genreCounts.map((g) => {
              const active = genreFilter === g.name;
              return (
                <button
                  key={g.name}
                  onClick={() => onGenreFilterChange(active ? null : g.name)}
                  className={`h-8 px-3.5 rounded-full border text-xs whitespace-nowrap flex items-center gap-1.5 shrink-0 transition-all duration-150 cursor-pointer outline-none ${
                    active
                      ? "border-white/50 bg-white/20 text-white font-semibold"
                      : "border-white/[0.08] bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
                  }`}
                >
                  <span>{lang === "tr" ? (GENRE_TR_MAP[g.name] || g.name) : g.name}</span>
                  <span className={active ? "text-zinc-300" : "text-zinc-500"}>
                    {g.count}
                  </span>
                </button>
              );
            })}
          </div>

          {genreCounts.length > 4 && (
            <div className="absolute right-0 flex items-center gap-1 pl-4 bg-gradient-to-l from-black via-black/90 to-transparent">
              <button
                onClick={() => scrollPills(-260)}
                className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300 cursor-pointer transition-colors outline-none"
                title={lang === "tr" ? "Sola kaydır" : "Scroll left"}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scrollPills(260)}
                className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300 cursor-pointer transition-colors outline-none"
                title={lang === "tr" ? "Sağa kaydır" : "Scroll right"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
