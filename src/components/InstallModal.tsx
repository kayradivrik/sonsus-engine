import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  FolderCheck,
  FolderOpen,
  HardDrive,
  Terminal,
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

  useEffect(() => {
    tauriApi
      .getInstallLocations()
      .then((list) => {
        setLocations(list);
        if (list.length > 0) {
          // Platforma uygun varsayılan dizini seç
          const preferred =
            game.platform === "epic"
              ? list.find((l) => l.path.includes("Heroic")) ?? list[0]
              : game.platform === "steam"
              ? list.find((l) => l.path.includes("steamapps")) ?? list[0]
              : list[0];
          setSelectedBaseDir(preferred.path);
          setLocateDir(`${preferred.path}/${sanitizeFolderName(game.title)}`);
        }
      })
      .catch(() => {});
  }, [game]);

  const previewInstallPath = selectedBaseDir
    ? `${selectedBaseDir.replace(/\/+$/, "")}/${sanitizeFolderName(game.title)}`
    : "";

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
      } else if (mode === "legendary_cli") {
        onNotify(`${game.title} için terminal üzerinden kurulum başlatıldı.`);
      } else {
        onNotify(`${game.title} kurulum istemcisi başlatıldı.`);
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
              Kurulum dizinini seçin veya diskteki mevcut oyun klasörünü bağlayın
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
                ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                : "bg-[#14141c] border-white/[0.07] text-zinc-400 hover:text-zinc-200"
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
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                : "bg-[#14141c] border-white/[0.07] text-zinc-400 hover:text-zinc-200"
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
                          ? "border-blue-500/70 bg-blue-500/10"
                          : "border-white/[0.08] bg-[#13131a] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-zinc-100 flex items-center gap-2">
                          <HardDrive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{loc.label}</span>
                        </span>
                        <span className="text-[11px] text-emerald-400 font-semibold shrink-0">
                          {formatBytes(loc.free_bytes)} boş
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-1 font-mono">
                        {loc.path}
                      </div>
                      {loc.total_bytes > 0 && (
                        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${usedRatio}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Özel Dizin Girişi */}
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Kurulum Ana Dizini (Düzenlenebilir)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedBaseDir}
                  onChange={(e) => setSelectedBaseDir(e.target.value)}
                  placeholder="/home/kullanici/Games"
                  className="flex-1 h-10 rounded-lg bg-[#14141c] border border-white/12 focus:border-blue-500 px-3 text-xs font-mono text-zinc-100 outline-none"
                />
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
              {game.platform === "epic" && (
                <button
                  type="button"
                  disabled={busy || !selectedBaseDir.trim()}
                  onClick={() => runInstall("legendary_cli")}
                  className="flex-1 h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Terminal className="w-4 h-4" />
                  <span>Seçili Klasöre Doğrudan İndir</span>
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => runInstall("platform")}
                className={`flex-1 h-10 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  game.platform === "epic"
                    ? "bg-[#1a1a24] hover:bg-[#232330] text-zinc-100 border border-white/15"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>
                  {game.platform === "steam"
                    ? "Steam İstemcisi ile İndir"
                    : game.platform === "epic"
                    ? "Heroic İstemcisinde Aç"
                    : "Mağaza İstemcisi ile İndir"}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4 text-xs">
            <p className="text-zinc-400 leading-relaxed">
              Oyun diskinizde zaten yüklüyse (örneğin başka bir diskte veya Heroic/Steam
              klasöründe), oyunun tam klasör yolunu girerek doğrudan{" "}
              <span className="text-emerald-400 font-semibold">Yüklü</span> durumuna
              geçirebilirsiniz.
            </p>

            <div>
              <label className="block text-[11px] text-zinc-300 font-semibold mb-1.5">
                Mevcut Oyun Klasörünün Tam Yolu
              </label>
              <input
                type="text"
                value={locateDir}
                onChange={(e) => setLocateDir(e.target.value)}
                placeholder="/home/kullanici/Games/OyunAdi"
                className="w-full h-10 rounded-lg bg-[#14141c] border border-white/15 focus:border-emerald-500 px-3 text-xs font-mono text-zinc-100 outline-none"
              />
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
                className="h-10 px-5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
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

