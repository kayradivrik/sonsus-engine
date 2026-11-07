import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (next: T) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Linux WebKitGTK üzerindeki beyaz sistem `<select>` kutularının yerine geçen,
 * karanlık temayla %100 uyumlu özel açılır menü bileşeni.
 */
export function CustomSelect<T extends string = string>({
  value,
  options,
  onChange,
  className = "",
  compact = false,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const activeOption =
    options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
          compact
            ? "h-8 px-3.5 rounded-full bg-[#0c0c10] hover:bg-[#15151c] border border-white/[0.09] text-xs text-zinc-300"
            : "h-10 px-3.5 rounded-lg bg-[#14141b] hover:bg-[#1b1b24] border border-white/12 text-xs text-zinc-100"
        }`}
      >
        <span className="truncate">{activeOption?.label ?? ""}</span>
        <span
          className={`flex items-center shrink-0 ${
            compact ? "" : "pl-2.5 border-l border-white/12"
          }`}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${
              open ? "rotate-180 text-white" : ""
            }`}
          />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 left-0 min-w-[180px] mt-1.5 z-50 rounded-xl bg-[#13131a] border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.9)] py-1 max-h-60 overflow-y-auto animate-fade-in">
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-xs flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                  selected
                    ? "bg-emerald-500/15 text-emerald-300 font-semibold"
                    : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {selected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
