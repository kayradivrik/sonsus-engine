import { RefObject, useRef } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { GenreCountItem } from "../hooks/useLibrary";
import { InstallStatus, Platform, SortMode } from "../types/game";
import { CustomSelect, SelectOption } from "./ui/CustomSelect";

interface FilterStripProps {
  query: string;
  onQueryChange: (q: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  statusFilter: "all" | InstallStatus;
  platformFilter: "all" | Platform;
  onPlatformFilterChange: (p: "all" | Platform) => void;
  genreFilter: string | null;
  onGenreFilterChange: (g: string | null) => void;
  genreCounts: GenreCountItem[];
  sortMode: SortMode;
  onSortModeChange: (m: SortMode) => void;
  visibleCount: number;
  counts: {
    all: number;
    installed: number;
    cloud: number;
    steam: number;
    epic: number;
    gog: number;
  };
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
  platformFilter,
  onPlatformFilterChange,
  genreFilter,
  onGenreFilterChange,
  genreCounts,
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
      ? "Yüklü oyunlar"
      : statusFilter === "cloud"
      ? "Bulut kütüphanesi"
      : "The library";

  const stores: { key: "all" | Platform; label: string; count: number }[] = [
    { key: "all", label: "Tümü", count: counts.all },
    { key: "steam", label: "Steam", count: counts.steam },
    { key: "epic", label: "Epic", count: counts.epic },
    { key: "gog", label: "GOG", count: counts.gog },
  ];

  return (
    <section className="max-w-[1480px] w-full mx-auto px-8 lg:px-12 pt-4 pb-6 shrink-0">
      {/* Başlık + Özel Karanlık Sıralama Menüsü & Sayaç */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[32px] md:text-[36px] font-bold tracking-tight text-white leading-none">
          {headingText}
        </h1>

        <div className="flex items-center gap-3">
          <CustomSelect
            compact
            value={sortMode}
            options={SORT_OPTIONS}
            onChange={onSortModeChange}
            className="w-48"
          />
          <span className="text-[13px] font-medium text-zinc-400 tabular-nums">
            {visibleCount.toLocaleString("tr-TR")} oyun
          </span>
        </div>
      </div>

      {/* Arama + Yenilenmiş Mağaza Seçici + Kategori Pill Barı */}
      <div className="mt-5 flex items-center gap-2.5">
        {/* Yuvarlatılmış Arama Kutusu */}
        <div className="relative flex items-center w-52 md:w-60 shrink-0">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Oyun ara..."
            className="w-full h-9 rounded-full bg-[#0c0c10] border border-white/[0.09] focus:border-white/30 pl-9 pr-8 text-[13px] text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors"
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              className="absolute right-3 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              title="Aramayı temizle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sade, Tek Katmanlı, Akıcı Mağaza Seçici (Tümü | Steam | Epic | GOG) */}
        <div className="h-9 rounded-full bg-[#0c0c10] border border-white/[0.09] p-1 flex items-center gap-0.5 shrink-0">
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
                className={`h-full px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                }`}
              >
                <span>{st.label}</span>
                {st.key !== "all" && (
                  <span
                    className={`text-[10px] tabular-nums ${
                      active ? "text-zinc-600" : "text-zinc-600"
                    }`}
                  >
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
            {genreCounts.map((g) => {
              const active = genreFilter === g.name;
              return (
                <button
                  key={g.name}
                  onClick={() => onGenreFilterChange(active ? null : g.name)}
                  className={`h-9 px-4 rounded-full border text-xs whitespace-nowrap flex items-center gap-1.5 shrink-0 transition-all duration-150 cursor-pointer ${
                    active
                      ? "border-white/70 bg-white/[0.13] text-white font-semibold"
                      : "border-white/[0.08] bg-[#0c0c10] hover:bg-[#15151c] text-zinc-300"
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
                className="w-7 h-7 rounded-full bg-[#14141a] hover:bg-[#22222c] border border-white/12 flex items-center justify-center text-zinc-300 cursor-pointer transition-colors"
                title="Sola kaydır"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scrollPills(260)}
                className="w-7 h-7 rounded-full bg-[#14141a] hover:bg-[#22222c] border border-white/12 flex items-center justify-center text-zinc-300 cursor-pointer transition-colors"
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
