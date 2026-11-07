import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageSizeOption } from "../types/game";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: PageSizeOption;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
}

const PAGE_SIZES: PageSizeOption[] = [24, 48, 96];

function buildPageSlots(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]);
  }
  return result;
}

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(totalItems, page * pageSize);
  const slots = buildPageSlots(page, totalPages);

  return (
    <div className="mt-10 pt-5 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
      {/* Sol: Aralık Gösterimi */}
      <div className="text-xs text-zinc-400 tabular-nums">
        Gösterilen:{" "}
        <span className="text-zinc-100 font-semibold">
          {rangeStart.toLocaleString("tr-TR")}–{rangeEnd.toLocaleString("tr-TR")}
        </span>{" "}
        / {totalItems.toLocaleString("tr-TR")} oyun
      </div>

      {/* Orta: Sayfa Numaraları (Kapsül Navigasyon) */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="h-9 px-3.5 rounded-full bg-[#0c0c11] hover:bg-[#171720] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Önceki</span>
          </button>

          <div className="h-9 rounded-full bg-[#0c0c11] border border-white/[0.09] p-1 flex items-center gap-0.5">
            {slots.map((slot, idx) =>
              slot === "ellipsis" ? (
                <span
                  key={`e-${idx}`}
                  className="px-2 text-xs text-zinc-500 select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onPageChange(slot)}
                  className={`min-w-[30px] h-full px-2.5 rounded-full text-xs tabular-nums transition-all cursor-pointer ${
                    slot === page
                      ? "bg-white text-black font-bold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {slot}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="h-9 px-3.5 rounded-full bg-[#0c0c11] hover:bg-[#171720] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
          >
            <span>Sonraki</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sağ: Sayfa Başı Oyun Seçici */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-500">Sayfa başı:</span>
        <div className="h-8 rounded-full bg-[#0c0c11] border border-white/[0.09] p-0.5 flex items-center gap-0.5">
          {PAGE_SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => onPageSizeChange(sz)}
              className={`h-full px-2.5 rounded-full text-[11px] font-semibold tabular-nums transition-colors cursor-pointer ${
                pageSize === sz
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

