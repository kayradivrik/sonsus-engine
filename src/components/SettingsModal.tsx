import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FolderOpen,
  FolderSearch,
  HardDrive,
  KeyRound,
  MonitorCog,
  Save,
  UserCheck,
} from "lucide-react";
import { tauriApi } from "../api/tauriClient";
import { useSmoothWheel } from "../hooks/useSmoothWheel";
import {
  AppSettings,
  DisplayBackend,
  InstallLocationOption,
  SystemDiagnostics,
  formatBytes,
} from "../types/game";
import { CustomSelect, SelectOption } from "./ui/CustomSelect";

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  diagnostics: SystemDiagnostics | null;
  onClose: () => void;
  onOpenOnboarding: () => void;
  onSave: (next: AppSettings) => Promise<void>;
}

type SettingsSection = "storage" | "hooks" | "integrations";

const BACKEND_OPTIONS: SelectOption<DisplayBackend>[] = [
  { value: "auto", label: "Otomatik Algıla" },
  { value: "xrandr", label: "X11 (xrandr)" },
  { value: "kscreen", label: "KDE Wayland (kscreen-doctor)" },
  { value: "gamescope", label: "Valve Gamescope" },
];

/**
 * `sonsus-engine` `#000000` tasarım dilinde iki sütunlu Kontrol Merkezi sayfası.
 */
export function SettingsModal({
  open,
  settings,
  diagnostics,
  onClose,
  onOpenOnboarding,
  onSave,
}: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("storage");
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [suspendText, setSuspendText] = useState(
    settings.default_hook.suspend_processes.join(", ")
  );
  const [customEnvText, setCustomEnvText] = useState(
    (settings.default_hook.custom_env ?? []).join(", ")
  );
  const [locations, setLocations] = useState<InstallLocationOption[]>([]);
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  useSmoothWheel(scrollRef, open);

  useEffect(() => {
    setDraft(settings);
    setSuspendText(settings.default_hook.suspend_processes.join(", "));
    setCustomEnvText((settings.default_hook.custom_env ?? []).join(", "));
  }, [settings, open]);

  useEffect(() => {
    if (!open) return;
    tauriApi
      .getInstallLocations()
      .then(setLocations)
      .catch(() => {});
  }, [open]);

  const displayOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "", label: "Birincil Ekran (Otomatik)" },
      ...(diagnostics?.displays ?? []).map((d) => ({
        value: d.name,
        label: `${d.name} (${d.current_mode} @ ${d.current_rate}Hz)`,
      })),
    ],
    [diagnostics]
  );

  const runnerOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "", label: "Varsayılan Başlatıcı / Otomatik" },
      ...(diagnostics?.runners ?? []).map((r) => ({
        value: r.path,
        label: `${r.name} (${r.kind.toUpperCase()})`,
      })),
    ],
    [diagnostics]
  );

  if (!open) return null;

  const fallbackInstallDir =
    locations.find((l) => l.path.includes("Heroic"))?.path ??
    locations[0]?.path ??
    "";

  const pickIntoField = async (
    current: string | null | undefined,
    apply: (picked: string) => void
  ) => {
    const chosen = await tauriApi.pickFolder(current || null);
    if (chosen) apply(chosen);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const updated: AppSettings = {
        ...draft,
        default_hook: {
          ...draft.default_hook,
          suspend_processes: suspendText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          custom_env: customEnvText
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.includes("=")),
        },
      };
      await onSave(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black text-zinc-100 flex flex-col overflow-hidden animate-detail-enter">
      {/* Üst Başlık Çubuğu */}
      <header className="h-16 border-b border-white/[0.06] shrink-0">
        <div className="h-full max-w-[1360px] w-full mx-auto px-8 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-full bg-[#121217] hover:bg-[#1b1b23] border border-white/12 flex items-center gap-2 text-xs font-medium text-zinc-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kütüphaneye Dön</span>
            </button>
            <span className="text-sm font-bold text-zinc-400">
              sonsus-engine / kontrol merkezi
            </span>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 px-5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</span>
          </button>
        </div>
      </header>

      {/* Sol Kapsül Navigasyon + Sağ Bento Ayar Alanı */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto py-8">
        <div className="max-w-[1360px] w-full mx-auto px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sol Menü */}
          <aside className="lg:col-span-3 space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-4">
              Ayarlar
            </h1>

            <button
              type="button"
              onClick={() => setActiveSection("storage")}
              className={`w-full h-11 px-4 rounded-full text-xs font-semibold flex items-center gap-3 transition-colors cursor-pointer ${
                activeSection === "storage"
                  ? "bg-white text-black"
                  : "bg-[#0c0c11] hover:bg-[#14141c] text-zinc-300 border border-white/[0.07]"
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Depolama ve Dizinler</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("hooks")}
              className={`w-full h-11 px-4 rounded-full text-xs font-semibold flex items-center gap-3 transition-colors cursor-pointer ${
                activeSection === "hooks"
                  ? "bg-white text-black"
                  : "bg-[#0c0c11] hover:bg-[#14141c] text-zinc-300 border border-white/[0.07]"
              }`}
            >
              <MonitorCog className="w-4 h-4" />
              <span>Proton, MangoHud & Hook</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("integrations")}
              className={`w-full h-11 px-4 rounded-full text-xs font-semibold flex items-center gap-3 transition-colors cursor-pointer ${
                activeSection === "integrations"
                  ? "bg-white text-black"
                  : "bg-[#0c0c11] hover:bg-[#14141c] text-zinc-300 border border-white/[0.07]"
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Mağaza ve API Bağlantıları</span>
            </button>
          </aside>

          {/* Sağ İçerik Kartları */}
          <div className="lg:col-span-9 space-y-6 text-xs">
            {activeSection === "storage" && (
              <>
                <section className="p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Kurulum, Wine Prefix ve Mağaza Kök Dizinleri
                    </h2>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Linux ve Windows ortamlarında yeni oyun indirmelerinde ve kütüphane
                      taramalarında kullanılacak klasörler.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1.5">
                        Öntanımlı Oyun Kurulum Dizini
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={fallbackInstallDir || "/home/kullanici/Games"}
                          value={draft.default_install_dir ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              default_install_dir: e.target.value || null,
                            })
                          }
                          className="flex-1 h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs font-mono text-zinc-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            pickIntoField(
                              draft.default_install_dir || fallbackInstallDir,
                              (picked) =>
                                setDraft({ ...draft, default_install_dir: picked })
                            )
                          }
                          className="h-10 px-3 rounded-xl bg-[#14141c] hover:bg-[#1d1d28] border border-white/12 text-zinc-300 hover:text-white cursor-pointer"
                          title="Klasör seç"
                        >
                          <FolderSearch className="w-4 h-4 text-blue-400" />
                        </button>
                        {(draft.default_install_dir || fallbackInstallDir) && (
                          <button
                            type="button"
                            onClick={() =>
                              tauriApi
                                .openGameFolder(
                                  draft.default_install_dir || fallbackInstallDir
                                )
                                .catch(() => {})
                            }
                            className="h-10 px-3 rounded-xl bg-[#14141c] hover:bg-[#1d1d28] border border-white/12 text-zinc-300 hover:text-white cursor-pointer"
                            title="Klasörü dosya yöneticisinde aç"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1.5">
                        Wine / Proton Prefix Klasörü (Linux)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="/home/kullanici/Games/Prefixes"
                          value={draft.default_prefix_dir ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              default_prefix_dir: e.target.value || null,
                            })
                          }
                          className="flex-1 h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs font-mono text-zinc-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            pickIntoField(draft.default_prefix_dir, (picked) =>
                              setDraft({ ...draft, default_prefix_dir: picked })
                            )
                          }
                          className="h-10 px-3 rounded-xl bg-[#14141c] hover:bg-[#1d1d28] border border-white/12 text-zinc-300 hover:text-white cursor-pointer"
                          title="Klasör seç"
                        >
                          <FolderSearch className="w-4 h-4 text-blue-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1.5">
                        Steam Kök Dizini (Boş bırakılırsa otomatik algılanır)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={
                            diagnostics?.detected_steam_root ??
                            "Otomatik (örn: ~/.steam/steam veya C:\\Program Files (x86)\\Steam)"
                          }
                          value={draft.custom_steam_root ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              custom_steam_root: e.target.value || null,
                            })
                          }
                          className="flex-1 h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs font-mono text-zinc-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            pickIntoField(
                              draft.custom_steam_root || diagnostics?.detected_steam_root,
                              (picked) =>
                                setDraft({ ...draft, custom_steam_root: picked })
                            )
                          }
                          className="h-10 px-3 rounded-xl bg-[#14141c] hover:bg-[#1d1d28] border border-white/12 text-zinc-300 hover:text-white cursor-pointer"
                          title="Özel Steam kök klasörü seç"
                        >
                          <FolderSearch className="w-4 h-4 text-blue-400" />
                        </button>
                        {(draft.custom_steam_root || diagnostics?.detected_steam_root) && (
                          <button
                            type="button"
                            onClick={() => {
                              const p =
                                draft.custom_steam_root ||
                                diagnostics?.detected_steam_root;
                              if (p) tauriApi.openGameFolder(p).catch(() => {});
                            }}
                            className="h-10 px-3 rounded-xl bg-[#14141c] hover:bg-[#1d1d28] border border-white/12 text-zinc-300 hover:text-white cursor-pointer"
                            title="Steam dizinini aç"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end pb-1">
                      <label className="w-full h-10 px-4 rounded-xl bg-black border border-white/[0.08] flex items-center justify-between cursor-pointer">
                        <span className="text-zinc-200 font-medium">
                          Epic Games & Heroic Kütüphanesini Eşitle
                        </span>
                        <input
                          type="checkbox"
                          checked={draft.sync_epic_heroic}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              sync_epic_heroic: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-emerald-500"
                        />
                      </label>
                    </div>
                  </div>
                </section>

                {/* Disk Doluluk Kartları */}
                {locations.length > 0 && (
                  <section className="p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-4">
                    <h2 className="text-sm font-bold text-white">
                      Algılanan Disk Bölümleri (Tıklayarak Varsayılan Seç)
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {locations.map((loc) => {
                        const selected = draft.default_install_dir === loc.path;
                        const usedPct =
                          loc.total_bytes > 0
                            ? Math.round(
                                ((loc.total_bytes - loc.free_bytes) /
                                  loc.total_bytes) *
                                  100
                              )
                            : 0;
                        return (
                          <button
                            key={loc.path}
                            type="button"
                            onClick={() =>
                              setDraft({ ...draft, default_install_dir: loc.path })
                            }
                            className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                              selected
                                ? "border-emerald-500/60 bg-emerald-500/[0.08]"
                                : "border-white/[0.08] bg-black hover:border-white/25"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-zinc-100 truncate">
                                {loc.label}
                              </span>
                              <span className="text-[11px] text-emerald-400 font-semibold shrink-0">
                                {formatBytes(loc.free_bytes)} boş
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono truncate mt-1">
                              {loc.path}
                            </div>
                            <div className="mt-2.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-white rounded-full"
                                style={{ width: `${usedPct}%` }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}

            {activeSection === "hooks" && (
              <section className="p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Varsayılan Proton, MangoHud, FSR & Çözünürlük Hook&apos;u
                    </h2>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Özel profili olmayan tüm oyunlar başlatılırken bu kurallar
                      uygulanır.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-white font-semibold shrink-0">
                    <input
                      type="checkbox"
                      checked={draft.default_hook.enabled}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          default_hook: {
                            ...draft.default_hook,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <span>Aktif</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1.5">
                    Varsayılan Uyumluluk Katmanı (Proton / GE-Proton / Wine)
                  </label>
                  <CustomSelect
                    value={draft.default_hook.runner_path ?? ""}
                    options={runnerOptions}
                    onChange={(val) =>
                      setDraft({
                        ...draft,
                        default_hook: {
                          ...draft.default_hook,
                          runner_path: val || null,
                        },
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1.5">
                      Görüntü Motoru
                    </label>
                    <CustomSelect
                      value={draft.default_hook.display_backend}
                      options={BACKEND_OPTIONS}
                      onChange={(val) =>
                        setDraft({
                          ...draft,
                          default_hook: {
                            ...draft.default_hook,
                            display_backend: val,
                          },
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1.5">
                      Hedef Monitör
                    </label>
                    <CustomSelect
                      value={draft.default_hook.target_output ?? ""}
                      options={displayOptions}
                      onChange={(val) =>
                        setDraft({
                          ...draft,
                          default_hook: {
                            ...draft.default_hook,
                            target_output: val || null,
                          },
                        })
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
                      value={draft.default_hook.target_resolution ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          default_hook: {
                            ...draft.default_hook,
                            target_resolution: e.target.value || null,
                          },
                        })
                      }
                      className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1.5">
                      Yenileme Hızı (Hz)
                    </label>
                    <input
                      type="text"
                      placeholder="144"
                      value={draft.default_hook.target_refresh_hz ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          default_hook: {
                            ...draft.default_hook,
                            target_refresh_hz: e.target.value || null,
                          },
                        })
                      }
                      className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="p-3 rounded-xl bg-black border border-white/[0.08] flex items-center gap-2.5 cursor-pointer text-zinc-200">
                    <input
                      type="checkbox"
                      checked={draft.default_hook.use_gamemode}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          default_hook: {
                            ...draft.default_hook,
                            use_gamemode: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <span>GameMode (`gamemoderun`)</span>
                  </label>

                  <label className="p-3 rounded-xl bg-black border border-white/[0.08] flex items-center gap-2.5 cursor-pointer text-zinc-200">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.default_hook.use_mangohud)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          default_hook: {
                            ...draft.default_hook,
                            use_mangohud: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <span>MangoHud FPS Katmanı</span>
                  </label>

                  <label className="p-3 rounded-xl bg-black border border-white/[0.08] flex items-center gap-2.5 cursor-pointer text-zinc-200">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.default_hook.gamescope_fsr)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          default_hook: {
                            ...draft.default_hook,
                            gamescope_fsr: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <span>Gamescope AMD FSR</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1.5">
                    Özel Ortam Değişkenleri (`ANAHTAR=DEĞER`, virgülle ayrılmış)
                  </label>
                  <input
                    type="text"
                    placeholder="DXVK_ASYNC=1, MANGOHUD_CONFIG=fps_limit=144"
                    value={customEnvText}
                    onChange={(e) => setCustomEnvText(e.target.value)}
                    className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1.5">
                    Oyun Sırasında Dondurulacak Süreçler (`SIGSTOP` / `SIGCONT`)
                  </label>
                  <input
                    type="text"
                    placeholder="firefox, chromium, discord, spotify"
                    value={suspendText}
                    onChange={(e) => setSuspendText(e.target.value)}
                    className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs outline-none"
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
                      value={draft.default_hook.pre_launch_cmd ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          default_hook: {
                            ...draft.default_hook,
                            pre_launch_cmd: e.target.value || null,
                          },
                        })
                      }
                      className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1.5">
                      Oyun Sonrası Komut (Post-exit)
                    </label>
                    <input
                      type="text"
                      placeholder="powerprofilesctl set balanced"
                      value={draft.default_hook.post_exit_cmd ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          default_hook: {
                            ...draft.default_hook,
                            post_exit_cmd: e.target.value || null,
                          },
                        })
                      }
                      className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs outline-none"
                    />
                  </div>
                </div>
              </section>
            )}

            {activeSection === "integrations" && (
              <>
                {/* Doğrudan Mağaza Oturumları Kısayolu */}
                <section className="p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-white">
                      Mağaza Oturumları & Giriş Ekranı
                    </h2>
                    <p className="text-[11px] text-zinc-400">
                      Epic Games, GOG ve oyuncu profilinizi doğrudan uygulama içi giriş
                      ekranından bağlayın veya yönetin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenOnboarding();
                    }}
                    className="h-10 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Giriş & Hesap Ekranını Aç</span>
                  </button>
                </section>

                <section className="p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-4">
                  <h2 className="text-base font-bold text-white">
                    API Anahtarları (İsteğe Bağlı)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1.5">
                        Steam Web API Key
                      </label>
                      <input
                        type="password"
                        placeholder="Steam Web API anahtarı..."
                        value={draft.steam_api_key ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            steam_api_key: e.target.value || null,
                          })
                        }
                        className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1.5">
                        SteamGridDB API Key
                      </label>
                      <input
                        type="password"
                        placeholder="Yüksek çözünürlüklü posterler için..."
                        value={draft.sgdb_api_key ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            sgdb_api_key: e.target.value || null,
                          })
                        }
                        className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-xs outline-none"
                      />
                    </div>
                  </div>
                </section>

                {diagnostics && (
                  <section className="p-6 rounded-2xl bg-[#09090d] border border-white/[0.08] space-y-3">
                    <h2 className="text-sm font-bold text-white">
                      Algılanan Sistem Ortamı ({diagnostics.session_type.toUpperCase()})
                    </h2>
                    <div className="text-zinc-400 space-y-1">
                      <div>
                        Steam ID64:{" "}
                        <span className="text-zinc-200 font-mono">
                          {diagnostics.detected_steam_id64 || "Yok"}
                        </span>
                      </div>
                      <div>
                        Heroic Yapılandırması:{" "}
                        <span className="text-zinc-200 font-mono">
                          {diagnostics.detected_heroic_config || "Yok"}
                        </span>
                      </div>
                      <div>
                        Algılanan Proton / Wine Sürümleri:{" "}
                        <span className="text-emerald-400 font-semibold">
                          {diagnostics.runners.length} adet
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {[
                        ["xrandr", diagnostics.has_xrandr],
                        ["kscreen-doctor", diagnostics.has_kscreen_doctor],
                        ["gamescope", diagnostics.has_gamescope],
                        ["gamemoderun", diagnostics.has_gamemoderun],
                        ["mangohud", diagnostics.has_mangohud],
                      ].map(([name, ok]) => (
                        <span
                          key={String(name)}
                          className={`px-3 py-1 rounded-full text-[11px] border ${
                            ok
                              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                              : "border-white/[0.06] text-zinc-600"
                          }`}
                        >
                          {String(name)}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
