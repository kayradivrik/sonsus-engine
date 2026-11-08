import {
  CheckCircle2,
  Download,
  FolderOpen,
  Pause,
  Play,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { tauriApi } from "../api/tauriClient";
import { DownloadTaskInfo, UnifiedGame } from "../types/game";

interface DownloadsModalProps {
  open: boolean;
  tasks: DownloadTaskInfo[];
  gamesById: Map<string, UnifiedGame>;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export function DownloadsModal({
  open,
  tasks,
  gamesById,
  onClose,
  onNotify,
}: DownloadsModalProps) {
  if (!open) return null;

  const handlePause = async (task: DownloadTaskInfo) => {
    try {
      await tauriApi.pauseGameDownload(task.game_id);
    } catch (err) {
      onNotify(`Duraklatılamadı: ${String(err)}`);
    }
  };

  const handleResume = async (task: DownloadTaskInfo) => {
    const game = gamesById.get(task.game_id);
    if (!game) {
      onNotify("Oyun kütüphane kaydı bulunamadı.");
      return;
    }
    try {
      await tauriApi.startGameDownload(game, task.target_dir);
      onNotify(`${task.title} indirmesi kaldığı yerden devam ediyor.`);
    } catch (err) {
      onNotify(`Devam ettirilemedi: ${String(err)}`);
    }
  };

  const handleRemove = async (task: DownloadTaskInfo) => {
    try {
      await tauriApi.removeDownloadTask(task.game_id);
    } catch (err) {
      onNotify(`Görev kaldırılamadı: ${String(err)}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#09090e] shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden animate-modal-pop"
      >
        {/* Başlık */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Arka Plan İndirme Yöneticisi
              </h3>
              <p className="text-[11px] text-zinc-400">
                Harici istemci açmadan doğrudan uygulama içi indirme kuyruğu
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

        {/* Liste */}
        <div className="p-6 max-h-[68vh] overflow-y-auto space-y-3">
          {tasks.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="text-xs font-semibold text-zinc-300">
                Aktif veya bekleyen indirme bulunmuyor
              </div>
              <div className="text-[11px] text-zinc-500">
                Buluttaki herhangi bir Epic veya GOG oyununda &quot;İndir&quot; butonuna
                tıklayarak doğrudan arka planda indirebilirsiniz.
              </div>
            </div>
          ) : (
            tasks.map((task) => {
              const isDownloading = task.status === "downloading";
              const isPaused = task.status === "paused";
              const isCompleted = task.status === "completed";
              const isFailed = task.status === "failed";

              return (
                <div
                  key={task.game_id}
                  className="p-4 rounded-2xl bg-[#0f0f16] border border-white/[0.09] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="bg-white text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-[3px]">
                          {task.platform}
                        </span>
                        <span className="text-sm font-bold text-white truncate">
                          {task.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-1 truncate font-mono">
                        {task.detail_text || task.target_dir}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {task.platform === "steam" ? (
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-semibold text-blue-300">
                          Steam İstemcisi
                        </span>
                      ) : (
                        <>
                          {isDownloading && (
                            <button
                              type="button"
                              onClick={() => handlePause(task)}
                              className="h-8 px-3 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                              title="İndirmeyi duraklat"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Duraklat</span>
                            </button>
                          )}

                          {(isPaused || isFailed) && (
                            <button
                              type="button"
                              onClick={() => handleResume(task)}
                              className="h-8 px-3 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                              title="Kaldığı yerden devam ettir"
                            >
                              <Play className="w-3.5 h-3.5 fill-black" />
                              <span>Devam Et</span>
                            </button>
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          tauriApi.openGameFolder(task.target_dir).catch(() => {})
                        }
                        className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/12 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
                        title="İndirme klasörünü aç"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemove(task)}
                        className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                        title={isDownloading ? "İndirmeyi iptal et" : "Listeden temizle"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* İlerleme Çubuğu */}
                  <div className="space-y-1.5">
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted
                            ? "bg-white"
                            : isFailed
                            ? "bg-zinc-600"
                            : isPaused
                            ? "bg-zinc-500"
                            : "bg-white"
                        }`}
                        style={{
                          width: `${Math.max(
                            isDownloading ? 2 : 0,
                            Math.min(100, task.progress_percent)
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 tabular-nums">
                      <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                        {isCompleted && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                        {isFailed && (
                          <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span>%{task.progress_percent.toFixed(1)}</span>
                      </span>

                      <div className="flex items-center gap-3">
                        {task.speed_text && <span>{task.speed_text}</span>}
                        {task.eta_text && isDownloading && (
                          <span>Kalan: {task.eta_text}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

