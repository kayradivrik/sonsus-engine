/**
 * `sonsus-engine` Tauri Rust Backend ile iletişim kuran merkezi ve tip güvenli API katmanı.
 */

import { invoke } from "@tauri-apps/api/core";
import {
  AppSettings,
  CustomGameInput,
  DownloadTaskInfo,
  HookProfile,
  InstallGamePayload,
  InstallLocationOption,
  OnlineGameDetails,
  StoreAuthStatus,
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

  pickExecutable: (initialDir?: string | null) =>
    invoke<string | null>("pick_executable", { initialDir: initialDir ?? null }),

  openGameFolder: (path: string) =>
    invoke<void>("open_game_folder", { path }),

  openExternalUrl: (url: string) =>
    invoke<void>("open_external_url", { url }),

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

  getStoreAuthStatus: () => invoke<StoreAuthStatus>("get_store_auth_status"),

  getOauthLoginUrls: () =>
    invoke<[string, string]>("get_oauth_login_urls"),

  connectEpicAccount: (code: string) =>
    invoke<string>("connect_epic_account", { code }),

  disconnectEpicAccount: () =>
    invoke<void>("disconnect_epic_account"),

  connectGogAccount: (code: string) =>
    invoke<string>("connect_gog_account", { code }),

  disconnectGogAccount: () =>
    invoke<void>("disconnect_gog_account"),

  setGamePreferences: (
    game: UnifiedGame,
    isFavorite: boolean,
    isHidden: boolean,
    collectionTag: string | null = null
  ) =>
    invoke<UnifiedGame>("set_game_preferences", {
      game,
      isFavorite,
      isHidden,
      collectionTag,
    }),

  addCustomGame: (input: CustomGameInput) =>
    invoke<UnifiedGame>("add_custom_game", { input }),

  uninstallGame: (game: UnifiedGame) =>
    invoke<UnifiedGame>("uninstall_game", { game }),

  verifyOrRepairGame: (game: UnifiedGame) =>
    invoke<DownloadTaskInfo | null>("verify_or_repair_game", { game }),

  checkGameUpdate: (game: UnifiedGame) =>
    invoke<UnifiedGame>("check_game_update", { game }),

  // --- E-Spor Ultra FPS & Sistem Optimizasyonu ---
  getUltraPerfStatus: () =>
    invoke<import("../types/game").UltraPerfStatus>("get_ultra_perf_status"),

  installBoostHelper: () =>
    invoke<string>("install_boost_helper"),

  triggerExtremeBoostNow: () =>
    invoke<string>("trigger_extreme_boost_now"),

  stopExtremeBoostNow: () =>
    invoke<string>("stop_extreme_boost_now"),

  applySteamEsportsPreset: (payload: import("../types/game").SteamEsportsPresetPayload) =>
    invoke<string>("apply_steam_esports_preset_command", { payload }),

  // --- Runner Manager (GE-Proton) ---
  listRemoteGeProton: () =>
    invoke<import("../types/game").RemoteRunnerRelease[]>("list_remote_ge_proton"),

  installGeProton: (tagName: string, downloadUrl: string) =>
    invoke<import("../types/game").RunnerInfo>("install_ge_proton", {
      tagName,
      downloadUrl,
    }),

  // --- Bulut Kayıt (Cloud Save) & Yedekler ---
  syncGameCloudSaves: (game: UnifiedGame) =>
    invoke<string>("sync_game_cloud_saves", { game }),

  createGameSaveBackup: (game: UnifiedGame) =>
    invoke<import("../types/game").SaveBackupInfo>("create_game_save_backup", { game }),

  getGameSaveBackups: (gameId: string) =>
    invoke<import("../types/game").SaveBackupInfo[]>("get_game_save_backups", { gameId }),

  restoreGameSaveBackup: (backupPath: string, game: UnifiedGame) =>
    invoke<void>("restore_game_save_backup", { backupPath, game }),

  // --- Canlı Çalıştırma Günlükleri ---
  getLaunchLogs: (gameId?: string) =>
    invoke<import("../types/game").LaunchLogEntry[]>("get_launch_logs", { gameId }),

  clearLaunchLogs: () =>
    invoke<void>("clear_launch_logs"),

  // --- Canlı İndirimler & Ücretsiz Oyunlar ---
  getCuratedDeals: () =>
    invoke<import("../types/game").GameDealItem[]>("get_curated_deals"),

  // --- Sağ Tık Kısayol, Dizin & Prefix ---
  createDesktopShortcut: (game: UnifiedGame) =>
    invoke<string>("create_desktop_shortcut", { game }),

  openGameInstallDir: (game: UnifiedGame) =>
    invoke<void>("open_game_install_dir", { game }),

  cleanGamePrefix: (gameId: string) =>
    invoke<string>("clean_game_prefix", { gameId }),

  // --- Disk Alanı Analizi & Shader / Çöp Temizleyici ---
  analyzeDiskStorage: () =>
    invoke<import("../types/game").StorageAnalysisResult>("analyze_disk_storage"),

  cleanStorageItem: (categoryId: string) =>
    invoke<number>("clean_storage_item", { categoryId }),
};
