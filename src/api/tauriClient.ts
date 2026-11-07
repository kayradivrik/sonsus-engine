/**
 * `sonsus-engine` Tauri Rust Backend ile iletişim kuran merkezi ve tip güvenli API katmanı.
 */

import { invoke } from "@tauri-apps/api/core";
import {
  AppSettings,
  DownloadTaskInfo,
  HookProfile,
  InstallGamePayload,
  InstallLocationOption,
  OnlineGameDetails,
  SystemDiagnostics,
  UnifiedGame,
} from "../types/game";

export const tauriApi = {
  getCachedLibrary: () => invoke<UnifiedGame[]>("get_cached_library"),

  scanAllLibraries: () => invoke<UnifiedGame[]>("scan_all_libraries"),

  launchGame: (game: UnifiedGame, hookOverride: HookProfile | null = null) =>
    invoke<UnifiedGame>("launch_game", { game, hookOverride }),

  getInstallLocations: () =>
    invoke<InstallLocationOption[]>("get_install_locations"),

  installGame: (payload: InstallGamePayload) =>
    invoke<UnifiedGame>("install_game", { payload }),

  startGameDownload: (game: UnifiedGame, targetDir: string) =>
    invoke<DownloadTaskInfo>("start_game_download", { game, targetDir }),

  pauseGameDownload: (gameId: string) =>
    invoke<void>("pause_game_download", { gameId }),

  removeDownloadTask: (gameId: string) =>
    invoke<void>("remove_download_task", { gameId }),

  getActiveDownloads: () =>
    invoke<DownloadTaskInfo[]>("get_active_downloads"),

  pickFolder: (initialDir?: string | null) =>
    invoke<string | null>("pick_folder", { initialDir: initialDir ?? null }),

  openGameFolder: (path: string) =>
    invoke<void>("open_game_folder", { path }),

  getOnlineGameDetails: (game: UnifiedGame, forceRefresh = false) =>
    invoke<OnlineGameDetails>("get_online_game_details", {
      game,
      forceRefresh,
    }),

  fetchGameCover: (game: UnifiedGame, forceSgdb = true) =>
    invoke<UnifiedGame>("fetch_game_cover", { game, forceSgdb }),

  getAppSettings: () => invoke<AppSettings>("get_app_settings"),

  updateAppSettings: (settings: AppSettings) =>
    invoke<void>("update_app_settings", { settings }),

  getGameHookProfile: (gameId: string) =>
    invoke<HookProfile | null>("get_game_hook_profile", { gameId }),

  setGameHookProfile: (gameId: string, profile: HookProfile | null) =>
    invoke<void>("set_game_hook_profile", { gameId, profile }),

  getSystemDiagnostics: () =>
    invoke<SystemDiagnostics>("get_system_diagnostics"),
};
