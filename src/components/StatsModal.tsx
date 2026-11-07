import { useMemo } from "react";
import {
  BarChart3,
  Clock,
  Gamepad2,
  HardDrive,
  Heart,
  Layers,
  Trophy,
  X,
} from "lucide-react";
import {
  UnifiedGame,
  buildCoverCandidates,
  formatBytes,
  formatPlaytime,
  platformLabel,
} from "../types/game";

interface StatsModalProps {
  open: boolean;
  games: UnifiedGame[];
  playerName?: string | null;
  onClose: () => void;
  onOpenDetail: (game: UnifiedGame) => void;
}

/**
 * Kütüphane İstatistik & Oyuncu Analiz Paneli (`StatsModal.tsx`).
 * Toplam oynama saati, disk dağılımı, mağaza oranları ve En Çok Oynananlar liderlik tablosu.
 */
export function StatsModal({
  open,
  games,
  playerName,
  onClose,
  onOpenDetail,
}: StatsModalProps) {
  const stats = useMemo(() => {
    const visible = games.filter((g) => !g.is_hidden);
    let totalMinutes = 0;
    let totalDiskBytes = 0;
    let installedCount = 0;
    let favCount = 0;
    let playedCount = 0;
    const byStore = { steam: 0, epic: 0, gog: 0, custom: 0 };
    const genreMap = new Map<string, number>();

    for (const g of visible) {
      totalMinutes += g.playtime_minutes || 0;
      if (g.playtime_minutes > 0) playedCount++;
      if (g.status === "installed") {
        installedCount++;
        totalDiskBytes += g.size_bytes || 0;
      }
      if (g.is_favorite) favCount++;
      byStore[g.platform] = (byStore[g.platform] ?? 0) + 1;
      for (const gn of g.genres ?? []) {
        genreMap.set(gn, (genreMap.get(gn) ?? 0) + 1);
      }
    }

    const topPlayed = [...visible]
      .filter((g) => g.playtime_minutes > 0)
      .sort((a, b) => b.playtime_minutes - a.playtime_minutes)
      .slice(0, 8);

    const topGenres = Array.from(genreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const completionRate =
      visible.length > 0 ? Math.round((playedCount / visible.length) * 100) : 0;

    return {
      totalGames: visible.length,
      installedCount,
      cloudCount: Math.max(0, visible.length - installedCount),
      favCount,
      totalHours: (totalMinutes / 60).toFixed(1),
      totalDiskBytes,
      byStore,
      topPlayed,
      topGenres,
      completionRate,
    };
  }, [games]);

  if (!open) return null;

  const maxPlaytime = stats.topPlayed[0]?.playtime_minutes || 1;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[88vh] rounded-3xl bg-[#07070b] border border-white/12 shadow-[0_30px_100px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden"
      >
        {/* Başlık */}
        <div className="px-7 py-5 border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {playerName
                  ? `${playerName} — Kütüphane İstatistikleri`
                  : "Kütüphane & Oyuncu İstatistik Paneli"}
              </h2>
              <p className="text-xs text-zinc-400">
                Tüm mağazalardaki oyun süresi, depolama ve koleksiyon analizi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/12 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Kaydırılabilir Bento Gövdesi */}
        <div className="flex-1 overflow-y-auto p-7 space-y-6">
          {/* Üst 4 Ana Metrik */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0c0c12] border border-white/[0.08] space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Toplam Kütüphane</span>
                <Gamepad2 className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-extrabold text-white tabular-nums">
                {stats.totalGames.toLocaleString("tr-TR")}
              </div>
              <div className="text-[11px] text-zinc-500">
                {stats.installedCount} yüklü • {stats.cloudCount} bulutta
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c0c12] border border-white/[0.08] space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Toplam Oynama Süresi</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">
                {stats.totalHours} saat
              </div>
              <div className="text-[11px] text-zinc-500">
                Kütüphanenin %{stats.completionRate}&apos;i denendi
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c0c12] border border-white/[0.08] space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Yüklü Disk Kullanımı</span>
                <HardDrive className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-extrabold text-white tabular-nums">
                {formatBytes(stats.totalDiskBytes)}
              </div>
              <div className="text-[11px] text-zinc-500">
                {stats.installedCount} kurulu oyun toplamı
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c0c12] border border-white/[0.08] space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Favori Koleksiyonu</span>
                <Heart className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-extrabold text-white tabular-nums">
                {stats.favCount}
              </div>
              <div className="text-[11px] text-zinc-500">
                Kalp ile işaretlenen oyunlar
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sol: En Çok Oynanan 8 Oyun */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-[#0c0c12] border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>En Çok Oynanan Oyunlar</span>
              </div>

              {stats.topPlayed.length === 0 ? (
                <p className="text-xs text-zinc-500 py-8 text-center">
                  Henüz oynama süresi kaydedilmiş bir oyun bulunmuyor.
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.topPlayed.map((g, i) => {
                    const pct = Math.max(
                      6,
                      Math.round((g.playtime_minutes / maxPlaytime) * 100)
                    );
                    const cover = buildCoverCandidates(g)[0] ?? null;
                    return (
                      <div
                        key={g.id}
                        onClick={() => {
                          onClose();
                          onOpenDetail(g);
                        }}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-colors"
                      >
                        <span className="w-5 text-xs font-mono text-zinc-500 text-right">
                          #{i + 1}
                        </span>
                        <div className="w-8 h-11 rounded-md overflow-hidden bg-black shrink-0 ring-1 ring-white/10">
                          {cover && (
                            <img
                              src={cover}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-zinc-100 truncate">
                              {g.title}
                            </span>
                            <span className="text-emerald-400 font-semibold shrink-0 tabular-nums">
                              {formatPlaytime(g.playtime_minutes)}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sağ: Mağaza Dağılımı & Baskın Türler */}
            <div className="lg:col-span-5 space-y-5">
              <div className="p-5 rounded-2xl bg-[#0c0c12] border border-white/[0.08] space-y-3.5">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Mağaza Dağılımı</span>
                </div>

                {(["steam", "epic", "gog", "custom"] as const).map((plat) => {
                  const count = stats.byStore[plat];
                  const pct =
                    stats.totalGames > 0
                      ? Math.round((count / stats.totalGames) * 100)
                      : 0;
                  return (
                    <div key={plat} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-200">
                          {platformLabel(plat)}
                        </span>
                        <span className="text-zinc-400 tabular-nums">
                          {count} oyun (%{pct})
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-white"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {stats.topGenres.length > 0 && (
                <div className="p-5 rounded-2xl bg-[#0c0c12] border border-white/[0.08] space-y-3">
                  <div className="text-sm font-bold text-white">
                    En Çok Sahip Olunan Türler
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stats.topGenres.map(([name, cnt]) => (
                      <span
                        key={name}
                        className="px-3 py-1.5 rounded-full bg-black border border-white/10 text-xs text-zinc-200 flex items-center gap-1.5"
                      >
                        <span>{name}</span>
                        <span className="text-zinc-500 tabular-nums">{cnt}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

