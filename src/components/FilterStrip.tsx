import { RefObject, useRef } from "react";
import { ChevronLeft, ChevronRight, EyeOff, Search, X } from "lucide-react";
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

const SORT_OPTIONS: SelectOption<SortMode>[] = [
  { value: "status", label: "Sırala: Yüklü Önce" },
  { value: "title", label: "Sırala: İsim (A-Z)" },
  { value: "playtime", label: "Sırala: Oynama Süresi" },
  { value: "recent", label: "Sırala: Son Oynanan" },
  { value: "size", label: "Sırala: Disk Boyutu" },
];

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
  const pillScrollRef = useRef<HTMLDivElement>(null);

  const scrollPills = (delta: number) => {
    pillScrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  const headingText =
    statusFilter === "installed"
      ? "Yüklü Oyunlar"
      : statusFilter === "cloud"
      ? "Bulut Kütüphanesi"
      : statusFilter === "favorites"
      ? "Favori Oyunlar"
      : statusFilter === "hidden"
      ? "Gizlenen Oyunlar"
      : "Kütüphane";

  const stores: { key: "all" | Platform; label: string; count: number }[] = [
    { key: "all", label: "Tümü", count: counts.all },
    { key: "steam", label: "Steam", count: counts.steam },
    { key: "epic", label: "Epic", count: counts.epic },
    { key: "gog", label: "GOG", count: counts.gog },
    ...(counts.custom > 0 || platformFilter === "custom"
      ? [{ key: "custom" as const, label: "Özel", count: counts.custom }]
      : []),
  ];

  return (
    <section className="max-w-[1480px] w-full mx-auto px-8 lg:px-12 pt-4 pb-6 shrink-0">
      {/* Başlık + Özel Karanlık Sıralama Menüsü & Sayaç */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-none">
            {headingText}
          </h1>

          {(counts.hidden > 0 || statusFilter === "hidden") && (
            <button
              type="button"
              onClick={() =>
                onStatusFilterChange(statusFilter === "hidden" ? "all" : "hidden")
              }
              className={`h-7 px-3 rounded-full text-[11px] font-medium flex items-center gap-1.5 border cursor-pointer transition-colors outline-none ${
                statusFilter === "hidden"
                  ? "bg-white text-black border-white font-semibold"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border-white/10"
              }`}
              title="Gizlenen oyunları göster / gizle"
            >
              <EyeOff className="w-3 h-3" />
              <span>Gizlenenler ({counts.hidden})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <CustomSelect
            compact
            value={sortMode}
            options={SORT_OPTIONS}
            onChange={onSortModeChange}
            className="w-48"
          />
          <span className="text-xs font-medium text-zinc-400 tabular-nums">
            {visibleCount.toLocaleString("tr-TR")} oyun
          </span>
        </div>
      </div>

      {/* Arama + Mağaza Seçici + Kategori Pill Barı */}
      <div className="mt-5 flex items-center gap-2.5">
        {/* Yuvarlatılmış Arama Kutusu */}
        <div className="relative flex items-center w-52 md:w-60 shrink-0">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Oyun ara... (/ veya Ctrl+K)"
            className="w-full h-9 rounded-full bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/10 focus:border-white/30 pl-9 pr-8 text-[13px] text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors"
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              className="absolute right-3 text-zinc-500 hover:text-zinc-200 cursor-pointer outline-none"
              title="Aramayı temizle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sade, Tek Katmanlı Mağaza Seçici */}
        <div className="h-9 rounded-full bg-zinc-900/60 border border-white/10 p-1 flex items-center gap-0.5 shrink-0">
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
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
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
                  className={`h-9 px-4 rounded-full border text-xs whitespace-nowrap flex items-center gap-1.5 shrink-0 transition-all duration-150 cursor-pointer outline-none ${
                    active
                      ? "border-white/40 bg-white/15 text-white font-medium"
                      : "border-white/[0.08] bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300"
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
                  className={`h-9 px-4 rounded-full border text-xs whitespace-nowrap flex items-center gap-1.5 shrink-0 transition-all duration-150 cursor-pointer outline-none ${
                    active
                      ? "border-white/50 bg-white/20 text-white font-semibold"
                      : "border-white/[0.08] bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300"
                  }`}
                >
                  <span>{g.name}</span>
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
                title="Sola kaydır"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scrollPills(260)}
                className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300 cursor-pointer transition-colors outline-none"
                title="Sağa kaydır"
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
