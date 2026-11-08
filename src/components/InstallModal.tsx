import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  FolderCheck,
  FolderOpen,
  FolderSearch,
  HardDrive,
  X,
} from "lucide-react";
import { tauriApi } from "../api/tauriClient";
import {
  InstallLocationOption,
  UnifiedGame,
  formatBytes,
} from "../types/game";

interface InstallModalProps {
  game: UnifiedGame;
  initialTab?: "install" | "locate";
  onClose: () => void;
  onGameUpdated: (updated: UnifiedGame) => void;
  onNotify: (msg: string) => void;
}

function sanitizeFolderName(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function joinChildPath(base: string, child: string): string {
  const sep = base.includes("\\") ? "\\" : "/";
  return `${base.replace(/[\\/]+$/, "")}${sep}${child}`;
}

export function InstallModal({
  game,
  initialTab = "install",
  onClose,
  onGameUpdated,
  onNotify,
}: InstallModalProps) {
  const [tab, setTab] = useState<"install" | "locate">(initialTab);
  const [locations, setLocations] = useState<InstallLocationOption[]>([]);
  const [selectedBaseDir, setSelectedBaseDir] = useState("");
  const [locateDir, setLocateDir] = useState("");
  const [busy, setBusy] = useState(false);

  const supportsDirectBackgroundDownload =
    game.platform === "epic" || game.platform === "gog";

  useEffect(() => {
    tauriApi
      .getInstallLocations()
      .then((list) => {
        setLocations(list);
        if (list.length > 0) {
          const preferred =
            game.platform === "epic"
              ? list.find((l) => l.path.includes("Heroic")) ?? list[0]
              : game.platform === "steam"
              ? list.find((l) => l.path.includes("steamapps")) ?? list[0]
              : list[0];
          setSelectedBaseDir(preferred.path);
          setLocateDir(joinChildPath(preferred.path, sanitizeFolderName(game.title)));
        }
      })
      .catch(() => {});
  }, [game]);

  const previewInstallPath = selectedBaseDir
    ? joinChildPath(selectedBaseDir, sanitizeFolderName(game.title))
    : "";

  const handleBrowseInstallDir = async () => {
    const chosen = await tauriApi.pickFolder(selectedBaseDir || null);
    if (chosen) {
      setSelectedBaseDir(chosen);
    }
  };

  const handleBrowseLocateDir = async () => {
    const chosen = await tauriApi.pickFolder(locateDir || selectedBaseDir || null);
    if (chosen) {
      setLocateDir(chosen);
    }
  };

  const handleDirectDownload = async () => {
    if (!selectedBaseDir.trim()) return;
    setBusy(true);
    try {
      await tauriApi.startGameDownload(game, selectedBaseDir.trim());
      onNotify(
        `${game.title} arka planda indirilmeye başlandı! Üst çubuktan ilerlemeyi takip edebilirsiniz.`
      );
      onClose();
    } catch (err) {
      onNotify(`Doğrudan indirme başlatılamadı: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const runInstall = async (mode: "platform" | "legendary_cli" | "locate") => {
    setBusy(true);
    try {
      const targetDir = mode === "locate" ? locateDir.trim() : selectedBaseDir.trim();
      const updated = await tauriApi.installGame({
        game,
        mode,
        target_dir: targetDir || null,
      });
      onGameUpdated(updated);
      if (mode === "locate") {
        onNotify(`${game.title} klasörü doğrulandı ve Yüklü olarak işaretlendi.`);
      } else {
        onNotify(`${game.title} mağaza kurulum istemcisi başlatıldı.`);
      }
      onClose();
    } catch (err) {
      onNotify(`İşlem başarısız: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#0e0e14] shadow-[0_24px_70px_rgba(0,0,0,0.9)] overflow-hidden animate-modal-pop"
      >
        {/* Başlık */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{game.title}</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Harici istemci açmadan doğrudan indirin veya mevcut klasörü bağlayın
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/12 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sekme Seçici */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("install")}
            className={`flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border ${
              tab === "install"
                ? "bg-white text-black border-white"
                : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Yeni Kurulum / İndir</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("locate")}
            className={`flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border ${
              tab === "locate"
                ? "bg-white text-black border-white"
                : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FolderCheck className="w-3.5 h-3.5" />
            <span>Oyunu İçe Aktar (Klasör Bağla)</span>
          </button>
        </div>

        {tab === "install" ? (
          <div className="p-6 space-y-4 text-xs">
            {/* Disk Konumları */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-zinc-300">
                Hedef Disk ve Kütüphane Klasörü
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {locations.map((loc) => {
                  const active = selectedBaseDir === loc.path;
                  const usedRatio =
                    loc.total_bytes > 0
                      ? Math.min(
                          100,
                          Math.max(
                            4,
                            Math.round(
                              ((loc.total_bytes - loc.free_bytes) / loc.total_bytes) * 100
                            )
                          )
                        )
                      : 0;

                  return (
                    <button
                      key={loc.path}
                      type="button"
                      onClick={() => setSelectedBaseDir(loc.path)}
                      className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? "border-white/40 bg-white/10"
                          : "border-white/[0.08] bg-zinc-900/60 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-zinc-100 flex items-center gap-2">
                          <HardDrive className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                          <span>{loc.label}</span>
                        </span>
                        <span className="text-[11px] text-zinc-300 font-semibold shrink-0">
                          {formatBytes(loc.free_bytes)} boş
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-1 font-mono">
                        {loc.path}
                      </div>
                      {loc.total_bytes > 0 && (
                        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full"
                            style={{ width: `${usedRatio}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Özel Dizin Girişi + Yerel Klasör Seçici */}
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Kurulum Ana Dizini (Düzenlenebilir)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedBaseDir}
                  onChange={(e) => setSelectedBaseDir(e.target.value)}
                  placeholder="/home/kullanici/Games veya D:\Games"
                  className="flex-1 h-10 rounded-lg bg-[#14141c] border border-white/12 focus:border-blue-500 px-3 text-xs font-mono text-zinc-100 outline-none"
                />
                <button
                  type="button"
                  onClick={handleBrowseInstallDir}
                  title="Klasör seç"
                  className="h-10 px-3 rounded-lg bg-[#181822] hover:bg-[#222230] border border-white/12 text-zinc-200 hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderSearch className="w-4 h-4 text-blue-400" />
                  <span>Gözat</span>
                </button>
                {selectedBaseDir && (
                  <button
                    type="button"
                    onClick={() =>
                      tauriApi.openGameFolder(selectedBaseDir).catch(() => {})
                    }
                    title="Bu klasörü dosya yöneticisinde aç"
                    className="h-10 px-3 rounded-lg bg-[#181822] hover:bg-[#222230] border border-white/12 text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                )}
              </div>
              {previewInstallPath && (
                <div className="mt-1.5 text-[11px] text-zinc-500 truncate">
                  Oluşturulacak oyun konumu:{" "}
                  <span className="text-zinc-300 font-mono">{previewInstallPath}</span>
                </div>
              )}
            </div>

            {/* Aksiyon Butonları */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              {supportsDirectBackgroundDownload && (
                <button
                  type="button"
                  disabled={busy || !selectedBaseDir.trim()}
                  onClick={handleDirectDownload}
                  className="flex-1 h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Uygulama İçinde Doğrudan İndir</span>
                </button>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={() => runInstall("platform")}
                className={`h-10 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  supportsDirectBackgroundDownload
                    ? "bg-[#1a1a24] hover:bg-[#232330] text-zinc-200 border border-white/15"
                    : "flex-1 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>
                  {game.platform === "steam"
                    ? "Steam İstemcisi ile İndir"
                    : "Mağaza İstemcisi ile Aç"}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4 text-xs">
            <p className="text-zinc-400 leading-relaxed">
              Oyun diskinizde zaten yüklüyse (örneğin başka bir diskte veya Heroic/Steam/Epic
              klasöründe), oyunun tam klasör yolunu seçerek doğrudan{" "}
              <span className="text-white font-semibold">Yüklü</span> durumuna
              geçirebilirsiniz.
            </p>

            <div>
              <label className="block text-[11px] text-zinc-300 font-semibold mb-1.5">
                Mevcut Oyun Klasörünün Tam Yolu
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locateDir}
                  onChange={(e) => setLocateDir(e.target.value)}
                  placeholder="/home/kullanici/Games/OyunAdi veya D:\Games\OyunAdi"
                  className="flex-1 h-10 rounded-lg bg-black border border-white/12 focus:border-white/40 px-3 text-xs font-mono text-zinc-100 outline-none"
                />
                <button
                  type="button"
                  onClick={handleBrowseLocateDir}
                  className="h-10 px-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/12 text-zinc-200 hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderSearch className="w-4 h-4 text-zinc-300" />
                  <span>Gözat</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-300 font-medium cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={busy || !locateDir.trim()}
                onClick={() => runInstall("locate")}
                className="h-10 px-5 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FolderCheck className="w-4 h-4" />
                <span>Klasörü Doğrula ve Bağla</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
