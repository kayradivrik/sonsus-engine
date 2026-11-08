import { useState } from "react";
import { FileCode2, FolderSearch, Plus, X } from "lucide-react";
import { tauriApi } from "../api/tauriClient";
import { UnifiedGame } from "../types/game";

interface AddCustomGameModalProps {
  open: boolean;
  onClose: () => void;
  onGameAdded: (game: UnifiedGame) => void;
  onNotify: (msg: string) => void;
}

function guessTitleFromPath(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  const fileName = parts[parts.length - 1] || "";
  const noExt = fileName.replace(/\.(exe|appimage|sh|bin|x86_64)$/i, "");
  return noExt.replace(/[-_]+/g, " ").trim();
}

/**
 * Harici / Özel Oyun (`.exe`, `.AppImage`, `.sh`, Emülatör vb.) Ekleme Penceresi.
 * Oluşturulduğu anda SteamGridDB / Steam CDN üzerinden otomatik poster de çeker.
 */
export function AddCustomGameModal({
  open,
  onClose,
  onGameAdded,
  onNotify,
}: AddCustomGameModalProps) {
  const [title, setTitle] = useState("");
  const [exePath, setExePath] = useState("");
  const [argsText, setArgsText] = useState("");
  const [workingDir, setWorkingDir] = useState("");
  const [winePrefix, setWinePrefix] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handlePickExe = async () => {
    const picked = await tauriApi.pickExecutable(workingDir || null);
    if (picked) {
      setExePath(picked);
      if (!title.trim()) {
        setTitle(guessTitleFromPath(picked));
      }
      const slashIdx = Math.max(picked.lastIndexOf("/"), picked.lastIndexOf("\\"));
      if (slashIdx > 0 && !workingDir.trim()) {
        setWorkingDir(picked.slice(0, slashIdx));
      }
    }
  };

  const handlePickFolder = async (setter: (v: string) => void, initial?: string) => {
    const picked = await tauriApi.pickFolder(initial || null);
    if (picked) setter(picked);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !exePath.trim()) {
      onNotify("Lütfen oyun adını ve çalıştırılabilir dosya yolunu seçin.");
      return;
    }
    setBusy(true);
    try {
      const created = await tauriApi.addCustomGame({
        title: title.trim(),
        executable_path: exePath.trim(),
        args: argsText
          .split(" ")
          .map((s) => s.trim())
          .filter(Boolean),
        working_dir: workingDir.trim() || null,
        wine_prefix: winePrefix.trim() || null,
      });
      onGameAdded(created);
      onNotify(`${created.title} kütüphaneye eklendi ve posteri eşitlendi!`);
      setTitle("");
      setExePath("");
      setArgsText("");
      setWorkingDir("");
      setWinePrefix("");
      onClose();
    } catch (err) {
      onNotify(`Oyun eklenemedi: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-[#09090d] border border-white/12 shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden text-xs"
      >
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Harici / Özel Oyun Ekle
              </h2>
              <p className="text-[11px] text-zinc-400">
                .exe, .AppImage, .sh veya emülatör oyunlarını kütüphaneye bağla
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/12 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1.5">
              Çalıştırılabilir Dosya (.exe / .AppImage / .sh / Binary)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={exePath}
                onChange={(e) => setExePath(e.target.value)}
                placeholder="/home/kullanici/Games/Oyun/Game.exe"
                className="flex-1 h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 font-mono text-zinc-100 outline-none"
              />
              <button
                type="button"
                onClick={handlePickExe}
                className="h-10 px-3.5 rounded-xl bg-[#14141d] hover:bg-[#1e1e2b] border border-white/12 text-zinc-200 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <FileCode2 className="w-4 h-4 text-zinc-300" />
                <span>Dosya Seç</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1.5">
              Oyun Başlığı (Poster ve mağaza bilgileri bu isme göre otomatik çekilir)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Cyberpunk 2077"
              className="w-full h-10 rounded-xl bg-black border border-white/12 focus:border-white/35 px-3.5 text-zinc-100 font-semibold outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1.5">
                Çalışma Klasörü (İsteğe Bağlı)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={workingDir}
                  onChange={(e) => setWorkingDir(e.target.value)}
                  placeholder="Otomatik"
                  className="flex-1 h-9 rounded-xl bg-black border border-white/12 px-3 font-mono text-zinc-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handlePickFolder(setWorkingDir, workingDir)}
                  className="h-9 px-2.5 rounded-xl bg-[#14141d] border border-white/12 text-zinc-300 cursor-pointer"
                >
                  <FolderSearch className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1.5">
                Wine / Proton Prefix (Linux .exe için)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={winePrefix}
                  onChange={(e) => setWinePrefix(e.target.value)}
                  placeholder="Varsayılan Prefix"
                  className="flex-1 h-9 rounded-xl bg-black border border-white/12 px-3 font-mono text-zinc-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handlePickFolder(setWinePrefix, winePrefix)}
                  className="h-9 px-2.5 rounded-xl bg-[#14141d] border border-white/12 text-zinc-300 cursor-pointer"
                >
                  <FolderSearch className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1.5">
              Başlatma Argümanları (İsteğe Bağlı)
            </label>
            <input
              type="text"
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              placeholder="-fullscreen -skipintro"
              className="w-full h-9 rounded-xl bg-black border border-white/12 px-3.5 font-mono text-zinc-200 outline-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.07] bg-black/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-full bg-white/[0.06] hover:bg-white/12 text-zinc-300 font-medium cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSubmit}
            className="h-10 px-6 rounded-full bg-white hover:bg-zinc-200 text-black font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{busy ? "Ekleniyor & Poster Çekiliyor..." : "Kütüphaneye Ekle"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

