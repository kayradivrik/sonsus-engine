import React, { useState, useEffect } from "react";
import { LaunchLogEntry } from "../types/game";
import { tauriApi } from "../api/tauriClient";

interface LaunchLogsModalProps {
  onClose: () => void;
  gameId?: string;
}

export const LaunchLogsModal: React.FC<LaunchLogsModalProps> = ({ onClose, gameId }) => {
  const [logs, setLogs] = useState<LaunchLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const data = await tauriApi.getLaunchLogs(gameId);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [gameId]);

  const handleClear = async () => {
    await tauriApi.clearLaunchLogs();
    setLogs([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0b0b0f] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="text-sm">📋</span>
            <h2 className="text-base font-bold text-white">
              Canlı Oyun Başlatma & Çökme Günlükleri
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg text-xs transition-colors"
            >
              Temizle
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/50 hover:text-white rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
          {loading ? (
            <div className="py-20 text-center text-white/40">Günlükler yükleniyor...</div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-white/40 font-sans">
              Henüz kaydedilmiş bir oyun çalıştırma veya çökme günlüğü bulunmuyor.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white font-sans">{log.game_title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        log.exit_code === 0 || log.exit_code === null
                          ? "bg-white/10 text-white border-white/20"
                          : "bg-zinc-800 text-zinc-300 border-white/10"
                      }`}
                    >
                      {log.exit_code !== null ? `Çıkış Kodu: ${log.exit_code}` : "Çalışıyor / Başarılı"}
                    </span>
                    {log.extreme_boost_active && (
                      <span className="text-[10px] bg-white/15 text-white border border-white/20 px-1.5 py-0.5 rounded font-mono">
                        Ultra FPS
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-white/40 font-sans">
                    {new Date(log.timestamp_epoch * 1000).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-white/60 text-[11px] break-all">
                  <span className="text-zinc-400">$ </span>
                  {log.command_repr}
                </div>

                {log.output_tail && (
                  <pre className="p-3 bg-black/50 border border-white/5 rounded-lg text-white/50 text-[10px] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {log.output_tail}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
