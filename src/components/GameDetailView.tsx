import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Cloud,
  CloudDownload,
  Cpu,
  Download,
  FolderCheck,
  FolderOpen,
  Gamepad2,
  Globe,
  HardDrive,
  ImageDown,
  Layers,
  MessageSquareQuote,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { tauriApi } from "../api/tauriClient";
import { useSmoothWheel } from "../hooks/useSmoothWheel";
import {
  DisplayBackend,
  DisplayOutputInfo,
  DownloadTaskInfo,
  HookProfile,
  OnlineGameDetails,
  UnifiedGame,
  buildCoverCandidates,
  createEmptyHookProfile,
  formatBytes,
  formatEpochDate,
  formatPlaytime,
  resolveMediaSrc,
} from "../types/game";
import { InstallModal } from "./InstallModal";
import { CustomSelect, SelectOption } from "./ui/CustomSelect";

interface GameDetailViewProps {
  game: UnifiedGame;
  autoOpenInstall: boolean;
  isRunning: boolean;
  downloadTask?: DownloadTaskInfo;
  displays: DisplayOutputInfo[];
  onBack: () => void;
  onLaunch: (game: UnifiedGame) => void;
  onGameUpdated: (updated: UnifiedGame) => void;
  onNotify: (msg: string) => void;
}

type DetailSection = "overview" | "requirements" | "reviews" | "hooks";

const BACKEND_OPTIONS: SelectOption<DisplayBackend>[] = [
  { value: "auto", label: "Otomatik Algıla" },
  { value: "xrandr", label: "X11 (xrandr)" },
  { value: "kscreen", label: "KDE Wayland (kscreen-doctor)" },
  { value: "gamescope", label: "Valve Gamescope" },
];

function parseRequirementLines(raw?: string | null): { key?: string; value: string }[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        Boolean(l) &&
        l.toLowerCase() !== "minimum:" &&
        l.toLowerCase() !== "önerilen:" &&
        l.toLowerCase() !== "recommended:"
    )
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx > 0 && idx < 32) {
        return {
          key: line.slice(0, idx).trim(),
          value: line.slice(idx + 1).trim(),
        };
      }
      return { value: line };
    })
    .filter((item) => Boolean(item.value));
}

function protonPillClass(tier?: string | null): string {
  switch ((tier ?? "").toLowerCase()) {
    case "platinum":
      return "border-cyan-400/35 bg-cyan-400/10 text-cyan-200";
    case "gold":
      return "border-amber-400/35 bg-amber-400/10 text-amber-300";
    case "silver":
      return "border-zinc-300/30 bg-zinc-300/10 text-zinc-200";
    case "bronze":
      return "border-orange-500/35 bg-orange-500/10 text-orange-300";
    case "native":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    default:
      return "border-white/12 bg-white/[0.06] text-zinc-300";
  }
}

/**
 * `sonsus-engine` sinematik siyah tasarım diline (%100 özgün kapsül navigasyon + tam genişlikli sahne + Bento bilgi kartları)
 * sahip tam ekran oyun detay sayfası. Steam, Epic Games Store ve GOG verilerini birleştirir.
 */
export function GameDetailView({
  game,
  autoOpenInstall,
  isRunning,
  downloadTask,
  displays,
  onBack,
  onLaunch,
  onGameUpdated,
  onNotify,
}: GameDetailViewProps) {
  const [section, setSection] = useState<DetailSection>("overview");
  const [details, setDetails] = useState<OnlineGameDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [coverBust, setCoverBust] = useState(0);
  const [posterIdx, setPosterIdx] = useState(0);
  const [fetchingCover, setFetchingCover] = useState(false);

  const [installModalTab, setInstallModalTab] = useState<"install" | "locate" | null>(
    autoOpenInstall && game.status !== "installed" ? "install" : null
  );
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const [hook, setHook] = useState<HookProfile>(createEmptyHookProfile());
  const [hasCustomHook, setHasCustomHook] = useState(false);
  const [suspendText, setSuspendText] = useState("");
  const [savingHook, setSavingHook] = useState(false);

  const pageScrollRef = useRef<HTMLDivElement>(null);
  useSmoothWheel(pageScrollRef, !installModalTab && !lightboxSrc);

  const isInstalled = game.status === "installed";

  const coverCandidates = useMemo(
    () => buildCoverCandidates(game, coverBust),
    [game, coverBust]
  );
  const activePoster =
    posterIdx < coverCandidates.length ? coverCandidates[posterIdx] : null;
  const localHero = resolveMediaSrc(game.hero_path_or_url);
  const heroBackdrop = details?.hero_url || localHero || activePoster;

  const displayOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "", label: "Birincil Ekran (Otomatik)" },
      ...displays.map((d) => ({
        value: d.name,
        label: `${d.name} (${d.current_mode} @ ${d.current_rate}Hz)`,
      })),
    ],
    [displays]
  );

  const loadOnlineInfo = (forceRefresh = false) => {
    setLoadingDetails(true);
    tauriApi
      .getOnlineGameDetails(game, forceRefresh)
      .then((fetched) => {
        setDetails(fetched);
        // Çevrimiçi çekilen yeni kategori etiketlerini ana kütüphane nesnesine de senkronla
        if (fetched.genres && fetched.genres.length > 0 && (!game.genres || game.genres.length === 0)) {
          onGameUpdated({ ...game, genres: fetched.genres });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDetails(false));
  };

  useEffect(() => {
    setPosterIdx(0);
    setDetails(null);
    setSection("overview");
    if (pageScrollRef.current) {
      pageScrollRef.current.scrollTop = 0;
    }
    loadOnlineInfo(false);

    tauriApi
      .getGameHookProfile(game.id)
      .then((saved) => {
        if (saved) {
          setHook(saved);
          setHasCustomHook(true);
          setSuspendText(saved.suspend_processes.join(", "));
        } else {
          setHook(createEmptyHookProfile());
          setHasCustomHook(false);
          setSuspendText("");
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (lightboxSrc) setLightboxSrc(null);
        else if (installModalTab) setInstallModalTab(null);
        else onBack();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightboxSrc, installModalTab, onBack]);

  const handleRefreshCover = async () => {
    setFetchingCover(true);
    try {
      const updated = await tauriApi.fetchGameCover(game, true);
      setCoverBust(Date.now());
      setPosterIdx(0);
      onGameUpdated(updated);
      onNotify(`${game.title} posteri güncellendi.`);
    } catch (err) {
      onNotify(`Poster indirilemedi: ${String(err)}`);
    } finally {
      setFetchingCover(false);
    }
  };

  const handleOpenFolder = async () => {
    if (!game.install_path) return;
    try {
      await tauriApi.openGameFolder(game.install_path);
    } catch (err) {
      onNotify(`Klasör açılamadı: ${String(err)}`);
    }
  };

  const handleSaveHook = async () => {
    setSavingHook(true);
    try {
      const payload: HookProfile = {
        ...hook,
        suspend_processes: suspendText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await tauriApi.setGameHookProfile(game.id, payload);
      setHook(payload);
      setHasCustomHook(true);
      onNotify(`${game.title} için özel başlatma profili kaydedildi.`);
    } catch (err) {
      onNotify(`Profil kaydedilemedi: ${String(err)}`);
    } finally {
      setSavingHook(false);
    }
  };

  const handleResetHook = async () => {
    await tauriApi.setGameHookProfile(game.id, null);
    setHook(createEmptyHookProfile());
    setSuspendText("");
    setHasCustomHook(false);
    onNotify("Özel oyun hook profili sıfırlandı.");
  };

  const minReqs = useMemo(
    () => parseRequirementLines(details?.minimum_requirements),
    [details?.minimum_requirements]
  );
  const recReqs = useMemo(
    () => parseRequirementLines(details?.recommended_requirements),
    [details?.recommended_requirements]
  );
  const linuxReqs = useMemo(
    () => parseRequirementLines(details?.linux_requirements),
    [details?.linux_requirements]
  );

  const effectiveGenres = useMemo(() => {
    const merged = new Set<string>(game.genres ?? []);
    for (const g of details?.genres ?? []) {
      merged.add(g);
    }
    return Array.from(merged);
  }, [game.genres, details?.genres]);

  const effectiveDevelopers =
    details && details.developers.length > 0
      ? details.developers.join(", ")
      : game.developer ?? null;

  const effectiveDescription = details?.short_description || game.summary_hint || null;
  const effectiveInstallBytes = game.size_bytes ?? details?.install_size_bytes ?? null;
  const playtimeText = formatPlaytime(game.playtime_minutes);

  const activeDl =
    downloadTask && downloadTask.status !== "completed" ? downloadTask : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-black text-zinc-100 overflow-hidden animate-detail-enter">
      {/* Üst Sabit Kapsül Çubuğu */}
      <header className="h-16 border-b border-white/[0.06] bg-black/80 backdrop-blur-md z-20 shrink-0">
        <div className="h-full max-w-[1480px] w-full mx-auto px-8 lg:px-12 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="h-9 px-4 rounded-full bg-[#121217] hover:bg-[#1b1b23] border border-white/12 flex items-center gap-2 text-xs font-medium text-zinc-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kütüphane</span>
            <span className="text-[10px] text-zinc-500 pl-1">ESC</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {details?.metacritic_score && (
              <span className="h-8 px-3 rounded-full border border-emerald-500/35 bg-emerald-500/10 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <span>Puan</span>
                <span>{details.metacritic_score}</span>
              </span>
            )}

            {details?.protondb_tier && (
              <span
                className={`h-8 px-3.5 rounded-full border text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${protonPillClass(
                  details.protondb_tier
                )}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ProtonDB • {details.protondb_tier}</span>
              </span>
            )}

            {details?.has_turkish && (
              <span className="h-8 px-3 rounded-full border border-white/12 bg-[#121218] text-zinc-200 text-[11px] font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Türkçe</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleRefreshCover}
              disabled={fetchingCover}
              className="h-8 px-3.5 rounded-full bg-[#121217] hover:bg-[#1c1c24] border border-white/10 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="SteamGridDB üzerinden yeni kapak görseli indir"
            >
              <ImageDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {fetchingCover ? "Poster İndiriliyor..." : "Poster Yenile"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => loadOnlineInfo(true)}
              disabled={loadingDetails}
              className="w-8 h-8 rounded-full bg-[#121217] hover:bg-[#1c1c24] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Çevrimiçi bilgileri yeniden çek"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingDetails ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Ana Kaydırılabilir Sinematik Sahne */}
      <div ref={pageScrollRef} className="flex-1 min-h-0 overflow-y-auto pb-20">
        {/* Tam Genişlikli Widescreen Hero Sahnesi */}
        <section className="relative overflow-hidden border-b border-white/[0.06]">
          {heroBackdrop && (
            <div className="absolute inset-0 pointer-events-none">
              <img
                src={heroBackdrop}
                alt=""
                className="w-full h-full object-cover opacity-35 scale-105 blur-[2px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/35" />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/65 to-transparent" />
            </div>
          )}

          <div className="relative z-10 max-w-[1480px] w-full mx-auto px-8 lg:px-12 pt-10 pb-10 flex flex-col md:flex-row items-start md:items-end gap-8">
            {/* Sol: Keskin 2:3 Dikey Poster */}
            <div className="w-36 sm:w-44 md:w-48 aspect-[2/3] rounded-[14px] overflow-hidden bg-[#0c0c12] ring-1 ring-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.95)] shrink-0">
              {activePoster ? (
                <img
                  src={activePoster}
                  alt={game.title}
                  onError={() => setPosterIdx((p) => p + 1)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 text-center text-xs font-semibold text-zinc-400">
                  {game.title}
                </div>
              )}
            </div>

            {/* Sağ: Başlık, Meta Bilgiler ve Renkli Kapsül Aksiyon Çubuğu */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-white text-black text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-[4px]">
                  {game.platform}
                </span>
                <span
                  className={`px-3 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isInstalled
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      : "border-blue-500/40 bg-blue-500/15 text-blue-300"
                  }`}
                >
                  {isInstalled ? "Bilgisayarda Yüklü" : "Bulut Kütüphanesinde"}
                </span>
                {effectiveGenres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-0.5 rounded-full text-[11px] bg-white/[0.06] border border-white/10 text-zinc-300"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-white leading-[1.08]">
                  {game.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                  {effectiveDevelopers && (
                    <span className="text-zinc-200 font-semibold">
                      {effectiveDevelopers}
                    </span>
                  )}
                  {details?.release_date && <span>{details.release_date}</span>}
                  {playtimeText && (
                    <span className="text-zinc-300">
                      Oynama süresi: <strong>{playtimeText}</strong>
                    </span>
                  )}
                  <span>Son oynama: {formatEpochDate(game.last_played_epoch)}</span>
                </div>
              </div>

              {/* CANLI UYGULAMA İÇİ İNDİRME PANELİ VEYA RENKLİ ANA AKSİYON KAPSÜLLERİ */}
              {activeDl && !isInstalled ? (
                <div className="p-4 rounded-2xl bg-[#0e0e16]/95 border border-blue-500/35 max-w-2xl space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-blue-400" />
                      <span>
                        {activeDl.status === "downloading"
                          ? "Uygulama İçinde İndiriliyor"
                          : activeDl.status === "paused"
                          ? "İndirme Duraklatıldı"
                          : "İndirme Durdu"}
                      </span>
                      <span className="text-blue-300 tabular-nums">
                        %{activeDl.progress_percent.toFixed(1)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {activeDl.status === "downloading" ? (
                        <button
                          type="button"
                          onClick={() =>
                            tauriApi.pauseGameDownload(game.id).catch(() => {})
                          }
                          className="h-8 px-3 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Duraklat</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            tauriApi
                              .startGameDownload(game, activeDl.target_dir)
                              .catch((e) => onNotify(String(e)))
                          }
                          className="h-8 px-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Devam Et</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          tauriApi.removeDownloadTask(game.id).catch(() => {})
                        }
                        className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-rose-500/20 flex items-center justify-center text-zinc-400 hover:text-rose-300 cursor-pointer"
                        title="İndirmeyi iptal et"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        activeDl.status === "paused" ? "bg-amber-400" : "bg-blue-500"
                      }`}
                      style={{
                        width: `${Math.max(
                          2,
                          Math.min(100, activeDl.progress_percent)
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 tabular-nums">
                    <span className="truncate font-mono">{activeDl.detail_text}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      {activeDl.speed_text && <span>{activeDl.speed_text}</span>}
                      {activeDl.eta_text && activeDl.status === "downloading" && (
                        <span>ETA: {activeDl.eta_text}</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  {isInstalled ? (
                    <>
                      <button
                        type="button"
                        disabled={isRunning}
                        onClick={() => onLaunch(game)}
                        className={`h-12 px-8 rounded-full font-extrabold text-sm flex items-center gap-2.5 transition-all cursor-pointer ${
                          isRunning
                            ? "bg-amber-400 text-black animate-pulse"
                            : "bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black shadow-[0_10px_35px_rgba(16,185,129,0.38)]"
                        }`}
                      >
                        <Play className="w-4 h-4 fill-black" />
                        <span>{isRunning ? "Çalışıyor..." : "Oyna / Giriş Yap"}</span>
                      </button>

                      {game.install_path && (
                        <button
                          type="button"
                          onClick={handleOpenFolder}
                          title={game.install_path}
                          className="h-12 px-5 rounded-full bg-[#121218] hover:bg-[#1b1b24] border border-white/15 text-xs font-semibold text-zinc-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <FolderOpen className="w-4 h-4 text-emerald-400" />
                          <span>Dosya Konumunu Aç</span>
                        </button>
                      )}

                      {game.install_path && (
                        <span className="text-[11px] text-zinc-400 font-mono truncate max-w-md px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07]">
                          {game.install_path}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setInstallModalTab("install")}
                        className="h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-extrabold text-sm flex items-center gap-2.5 shadow-[0_10px_35px_rgba(37,99,235,0.4)] transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>İndir / Kurulum Başlat</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInstallModalTab("locate")}
                        className="h-12 px-5 rounded-full bg-[#121218] hover:bg-[#1b1b24] border border-white/15 text-xs font-semibold text-zinc-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FolderCheck className="w-4 h-4 text-blue-400" />
                        <span>Mevcut Klasörü Bağla</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Alt İçerik Konteyneri */}
        <div className="max-w-[1480px] w-full mx-auto px-8 lg:px-12 pt-7 space-y-8">
          {/* KURULUM BİLGİSİ BENTO ŞERİDİ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#0a0a0f] border border-white/[0.08] flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/12 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
                <CloudDownload className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-zinc-500 font-medium">
                  İndirme Boyutu
                </div>
                <div className="text-sm font-bold text-white mt-0.5 truncate">
                  {details?.download_size_bytes
                    ? formatBytes(details.download_size_bytes)
                    : isInstalled
                    ? "Yerel Diskte Hazır"
                    : loadingDetails
                    ? "Hesaplanıyor..."
                    : "Kurulumda Belirlenir"}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0a0a0f] border border-white/[0.08] flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-zinc-500 font-medium">
                  {isInstalled ? "Kurulum Boyutu" : "Gerekli Disk Alanı"}
                </div>
                <div className="text-sm font-bold text-white mt-0.5 truncate">
                  {effectiveInstallBytes
                    ? formatBytes(effectiveInstallBytes)
                    : loadingDetails
                    ? "Sorgulanıyor..."
                    : "Bilinmiyor"}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0a0a0f] border border-white/[0.08] flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/12 border border-purple-500/25 flex items-center justify-center text-purple-300 shrink-0">
                <Cloud className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-zinc-500 font-medium">
                  Bulut Kayıt & Sürüm
                </div>
                <div className="text-sm font-bold text-white mt-0.5 truncate">
                  {details?.cloud_saves_supported
                    ? "Bulut Kayıt Aktif"
                    : "Yerel Kayıt"}
                  {details?.build_version ? ` • ${details.build_version}` : ""}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0a0a0f] border border-white/[0.08] flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/12 border border-cyan-500/25 flex items-center justify-center text-cyan-300 shrink-0">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-zinc-500 font-medium">
                  Uyumluluk & Kontrolcü
                </div>
                <div className="text-sm font-bold text-white mt-0.5 truncate">
                  {details?.controller_support ??
                    (details?.protondb_tier
                      ? `ProtonDB ${details.protondb_tier.toUpperCase()}`
                      : "Standart Girdi")}
                </div>
              </div>
            </div>
          </div>

          {/* Kapsül Sekme Çubuğu */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="h-10 rounded-full bg-[#0c0c10] border border-white/[0.09] p-1 inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSection("overview")}
                className={`h-full px-4 rounded-full text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  section === "overview"
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Genel Bakış & Kurulum Bilgisi</span>
              </button>

              <button
                type="button"
                onClick={() => setSection("requirements")}
                className={`h-full px-4 rounded-full text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  section === "requirements"
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Sistem Gereksinimleri</span>
              </button>

              <button
                type="button"
                onClick={() => setSection("reviews")}
                className={`h-full px-4 rounded-full text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  section === "reviews"
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <MessageSquareQuote className="w-3.5 h-3.5" />
                <span>Oyuncu İncelemeleri</span>
                {details && details.reviews.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      section === "reviews"
                        ? "bg-black/15 text-black"
                        : "bg-white/10 text-zinc-200"
                    }`}
                  >
                    {details.reviews.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSection("hooks")}
                className={`h-full px-4 rounded-full text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  section === "hooks"
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Başlatma & Çözünürlük Hook</span>
                {hasCustomHook && hook.enabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
            </div>
          </div>

          {/* SEKME 1: GENEL BAKIŞ, EKRAN GÖRÜNTÜLERİ VE KURULUM ÖZETİ */}
          {section === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
              <div className="lg:col-span-7 space-y-7">
                <div className="p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-3">
                  <h2 className="text-sm font-bold text-white">Oyun Hakkında</h2>
                  {loadingDetails && !effectiveDescription ? (
                    <div className="space-y-2.5 animate-pulse">
                      <div className="h-3.5 bg-white/10 rounded w-11/12" />
                      <div className="h-3.5 bg-white/10 rounded w-full" />
                      <div className="h-3.5 bg-white/10 rounded w-3/4" />
                    </div>
                  ) : effectiveDescription ? (
                    <p className="text-[13.5px] text-zinc-300 leading-relaxed whitespace-pre-line">
                      {effectiveDescription}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Bu oyun için mağaza açıklama metni bulunamadı.
                    </p>
                  )}
                </div>

                {/* Ekran Görüntüleri */}
                {details && details.screenshots.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-white">
                      Ekran Görüntüleri
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {details.screenshots.map((shot, idx) => (
                        <button
                          key={shot}
                          type="button"
                          onClick={() => setLightboxSrc(shot)}
                          className="aspect-video rounded-xl overflow-hidden bg-[#0c0c12] border border-white/[0.08] hover:border-white/35 group cursor-pointer"
                        >
                          <img
                            src={shot}
                            alt={`${game.title} görsel ${idx + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Öne Çıkan İnceleme Önizlemesi */}
                {details && details.reviews.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-white">
                        Topluluk İncelemelerinden Seçmeler
                      </h2>
                      <button
                        type="button"
                        onClick={() => setSection("reviews")}
                        className="text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
                      >
                        Tüm incelemeleri oku ({details.reviews.length}) →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {details.reviews.slice(0, 2).map((rev, idx) => (
                        <div
                          key={`${rev.author}-${idx}`}
                          className="p-4 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span
                              className={`inline-flex items-center gap-1.5 font-semibold ${
                                rev.recommended
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {rev.recommended ? (
                                <ThumbsUp className="w-3.5 h-3.5" />
                              ) : (
                                <ThumbsDown className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {rev.recommended
                                  ? "Tavsiye Ediliyor"
                                  : "Tavsiye Edilmiyor"}
                              </span>
                            </span>
                            <span className="text-[11px] text-zinc-500 truncate">
                              {rev.hours_played}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4 whitespace-pre-line">
                            {rev.content}
                          </p>
                          <div className="text-[11px] text-zinc-500">
                            — {rev.author}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sağ Sütun: Detaylı Kurulum & Teknik Kütüphane Özeti + Hızlı Sistem Gereksinimi Özeti */}
              <div className="lg:col-span-5 space-y-5">
                <div className="p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-4">
                  <h2 className="text-sm font-bold text-white">
                    Kurulum ve Teknik Bilgiler
                  </h2>
                  <div className="divide-y divide-white/[0.06] text-xs">
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <span className="text-zinc-500">Durum</span>
                      <span
                        className={
                          isInstalled
                            ? "text-emerald-400 font-semibold"
                            : "text-blue-400 font-semibold"
                        }
                      >
                        {isInstalled ? "Yüklü" : "Bulutta (İndirilmedi)"}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <span className="text-zinc-500">İndirme Boyutu</span>
                      <span className="text-zinc-200 font-medium">
                        {details?.download_size_bytes
                          ? formatBytes(details.download_size_bytes)
                          : "—"}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <span className="text-zinc-500">Kurulum / Disk Boyutu</span>
                      <span className="text-zinc-200 font-medium">
                        {formatBytes(effectiveInstallBytes)}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <span className="text-zinc-500 shrink-0">Kurulum Yolu</span>
                      <span className="text-zinc-300 font-mono text-[11px] truncate">
                        {game.install_path || "Kurulumda seçilecek"}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <span className="text-zinc-500">Mağaza Kimliği</span>
                      <span className="text-zinc-300 font-mono">
                        {game.platform.toUpperCase()} / {game.platform_id}
                      </span>
                    </div>
                    {effectiveDevelopers && (
                      <div className="py-2.5 flex items-center justify-between gap-4">
                        <span className="text-zinc-500">Geliştirici</span>
                        <span className="text-zinc-200 truncate">
                          {effectiveDevelopers}
                        </span>
                      </div>
                    )}
                    {details && details.publishers.length > 0 && (
                      <div className="py-2.5 flex items-center justify-between gap-4">
                        <span className="text-zinc-500">Yayıncı</span>
                        <span className="text-zinc-200 truncate">
                          {details.publishers.join(", ")}
                        </span>
                      </div>
                    )}
                    {details?.protondb_tier && (
                      <div className="py-2.5 flex items-center justify-between gap-4">
                        <span className="text-zinc-500">Linux / ProtonDB</span>
                        <span className="text-emerald-300 font-semibold uppercase">
                          {details.protondb_tier}
                          {details.protondb_total
                            ? ` (${details.protondb_total} rapor)`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {minReqs.length > 0 && (
                  <div className="p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-white">
                        Minimum Sistem Özeti
                      </h2>
                      <button
                        type="button"
                        onClick={() => setSection("requirements")}
                        className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                      >
                        Detaylar →
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      {minReqs.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                          {item.key && (
                            <span className="text-[11px] text-zinc-500">
                              {item.key}
                            </span>
                          )}
                          <span className="text-zinc-200">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEKME 2: KARŞILAŞTIRMALI SİSTEM GEREKSİNİMLERİ (Minimum & Önerilen & Linux) */}
          {section === "requirements" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      Minimum Sistem Gereksinimleri
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-white/[0.06] text-zinc-400">
                      Temel
                    </span>
                  </div>
                  {minReqs.length > 0 ? (
                    <div className="divide-y divide-white/[0.06] text-xs">
                      {minReqs.map((r, i) => (
                        <div key={i} className="py-2.5 flex flex-col gap-0.5">
                          {r.key && (
                            <span className="text-[11px] text-zinc-500 font-medium">
                              {r.key}
                            </span>
                          )}
                          <span className="text-zinc-200 leading-relaxed">
                            {r.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Bu oyun için mağazada minimum sistem gereksinimi bilgisi paylaşılmamış.
                    </p>
                  )}
                </div>

                <div className="p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      Önerilen Sistem Gereksinimleri
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Önerilen
                    </span>
                  </div>
                  {recReqs.length > 0 ? (
                    <div className="divide-y divide-white/[0.06] text-xs">
                      {recReqs.map((r, i) => (
                        <div key={i} className="py-2.5 flex flex-col gap-0.5">
                          {r.key && (
                            <span className="text-[11px] text-zinc-500 font-medium">
                              {r.key}
                            </span>
                          )}
                          <span className="text-zinc-200 leading-relaxed">
                            {r.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Mağaza tarafından ayrı bir önerilen donanım profili belirtilmemiş;
                      minimum gereksinimleri baz alabilirsiniz.
                    </p>
                  )}
                </div>
              </div>

              {linuxReqs.length > 0 && (
                <div className="p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-3">
                  <span className="text-sm font-bold text-emerald-300">
                    Yerel Linux Sistem Gereksinimleri
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    {linuxReqs.map((r, i) => (
                      <div key={i}>
                        {r.key && (
                          <div className="text-[11px] text-zinc-500">{r.key}</div>
                        )}
                        <div className="text-zinc-200">{r.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEKME 3: OYUNCU İNCELEMELERİ */}
          {section === "reviews" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadingDetails ? (
                [1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-36 rounded-2xl bg-[#09090d] border border-white/[0.06] animate-pulse"
                  />
                ))
              ) : !details || details.reviews.length === 0 ? (
                <div className="col-span-full py-16 text-center text-xs text-zinc-500">
                  Bu oyun için çevrimiçi oyuncu incelemesi bulunamadı.
                </div>
              ) : (
                details.reviews.map((rev, idx) => (
                  <article
                    key={`${rev.author}-${idx}`}
                    className="p-5 rounded-2xl bg-[#09090d] border border-white/[0.08] flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 border ${
                            rev.recommended
                              ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-300"
                              : "border-rose-500/35 bg-rose-500/12 text-rose-300"
                          }`}
                        >
                          {rev.recommended ? (
                            <ThumbsUp className="w-3 h-3" />
                          ) : (
                            <ThumbsDown className="w-3 h-3" />
                          )}
                          <span>
                            {rev.recommended
                              ? "Tavsiye Ediliyor"
                              : "Tavsiye Edilmiyor"}
                          </span>
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {rev.hours_played}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-line">
                        {rev.content}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-500">
                      <span className="font-semibold text-zinc-300">
                        {rev.author}
                      </span>
                      <span>{rev.helpful_text || rev.date_posted}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {/* SEKME 4: OYUN BAZLI ÇÖZÜNÜRLÜK & ARKA PLAN SÜREÇ HOOK AYARLARI */}
          {section === "hooks" && (
            <div className="max-w-3xl p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-5 text-xs">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {game.title} — Özel Başlatma & Çözünürlük Profili
                  </h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Oyun başlarken ekran çözünürlüğünü ve arka plan süreçlerini
                    otomatik uyarlar, oyun kapandığında eski haline döndürür.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-white shrink-0">
                  <input
                    type="checkbox"
                    checked={hook.enabled}
                    onChange={(e) =>
                      setHook({ ...hook, enabled: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <span>Etkin</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1.5">
                    Görüntü Motoru
                  </label>
                  <CustomSelect
                    value={hook.display_backend}
                    options={BACKEND_OPTIONS}
                    onChange={(val) =>
                      setHook({ ...hook, display_backend: val })
                    }
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1.5">
                    Hedef Monitör
                  </label>
                  <CustomSelect
                    value={hook.target_output ?? ""}
                    options={displayOptions}
                    onChange={(val) =>
                      setHook({ ...hook, target_output: val || null })
                    }
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1.5">
                    Hedef Çözünürlük
                  </label>
                  <input
                    type="text"
                    placeholder="1920x1080"
                    value={hook.target_resolution ?? ""}
                    onChange={(e) =>
                      setHook({
                        ...hook,
                        target_resolution: e.target.value || null,
                      })
                    }
                    className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs text-zinc-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1.5">
                    Yenileme Hızı (Hz)
                  </label>
                  <input
                    type="text"
                    placeholder="144"
                    value={hook.target_refresh_hz ?? ""}
                    onChange={(e) =>
                      setHook({
                        ...hook,
                        target_refresh_hz: e.target.value || null,
                      })
                    }
                    className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs text-zinc-100 outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer text-zinc-200">
                <input
                  type="checkbox"
                  checked={hook.use_gamemode}
                  onChange={(e) =>
                    setHook({ ...hook, use_gamemode: e.target.checked })
                  }
                  className="w-4 h-4 accent-emerald-500"
                />
                <span>Feral GameMode (`gamemoderun`) ile başlat</span>
              </label>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1.5">
                  Oyun Sırasında Dondurulacak Süreçler (`SIGSTOP` / `SIGCONT`)
                </label>
                <input
                  type="text"
                  placeholder="firefox, discord, spotify"
                  value={suspendText}
                  onChange={(e) => setSuspendText(e.target.value)}
                  className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs text-zinc-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1.5">
                    Oyun Öncesi Komut (Pre-launch)
                  </label>
                  <input
                    type="text"
                    placeholder="powerprofilesctl set performance"
                    value={hook.pre_launch_cmd ?? ""}
                    onChange={(e) =>
                      setHook({
                        ...hook,
                        pre_launch_cmd: e.target.value || null,
                      })
                    }
                    className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs text-zinc-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1.5">
                    Oyun Sonrası Komut (Post-exit)
                  </label>
                  <input
                    type="text"
                    placeholder="powerprofilesctl set balanced"
                    value={hook.post_exit_cmd ?? ""}
                    onChange={(e) =>
                      setHook({
                        ...hook,
                        post_exit_cmd: e.target.value || null,
                      })
                    }
                    className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs text-zinc-100 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveHook}
                  disabled={savingHook}
                  className="h-10 px-6 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Profili Kaydet</span>
                </button>

                {hasCustomHook && (
                  <button
                    type="button"
                    onClick={handleResetHook}
                    className="h-10 px-5 rounded-full bg-white/[0.06] hover:bg-white/12 border border-white/10 text-zinc-300 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Varsayılana Dön</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {installModalTab && (
        <InstallModal
          game={game}
          initialTab={installModalTab}
          onClose={() => setInstallModalTab(null)}
          onGameUpdated={onGameUpdated}
          onNotify={onNotify}
        />
      )}

      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 cursor-zoom-out animate-fade-in"
        >
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxSrc}
            alt="Ekran görüntüsü"
            className="max-w-full max-h-full rounded-2xl border border-white/15 shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
