import { convertFileSrc } from "@tauri-apps/api/core";

export type Platform = "steam" | "epic" | "gog" | "custom";
export type InstallStatus = "installed" | "cloud";
export type LibraryQuickFilter =
  | "all"
  | "installed"
  | "cloud"
  | "favorites"
  | "hidden";
export interface GameDealItem {
  id: string;
  title: string;
  store: "steam" | "epic" | string;
  original_price?: string | null;
  final_price: string;
  discount_percent: number;
  is_free: boolean;
  banner_url: string;
  store_url: string;
  expiry_date?: string | null;
}

export type DisplayBackend = "auto" | "xrandr" | "gamescope" | "kscreen";
export type AppNavTab = "home" | "library";
export type SortMode = "status" | "title" | "playtime" | "recent" | "size";
export type ViewMode = "grid" | "table";
export type PageSizeOption = 24 | 48 | 96;

export interface LaunchConfig {
  command_uri_or_bin: string;
  args: string[];
  working_dir?: string | null;
  wine_prefix?: string | null;
}

export interface HookProfile {
  enabled: boolean;
  display_backend: DisplayBackend;
  target_output?: string | null;
  target_resolution?: string | null;
  target_refresh_hz?: string | null;
  use_gamemode: boolean;
  use_mangohud: boolean;
  gamescope_fsr: boolean;
  extreme_boost?: boolean;
  pin_p_cores?: boolean;
  force_dgpu?: boolean;
  disable_steam_overlay_preload?: boolean;
  runner_path?: string | null;
  custom_env: string[];
  suspend_processes: string[];
  pre_launch_cmd?: string | null;
  post_exit_cmd?: string | null;
}

export interface UnifiedGame {
  id: string;
  platform_id: string;
  platform: Platform;
  title: string;
  status: InstallStatus;
  install_path?: string | null;
  size_bytes?: number | null;
  playtime_minutes: number;
  last_played_epoch?: number | null;
  cover_path_or_url?: string | null;
  fallback_cover_url?: string | null;
  hero_path_or_url?: string | null;
  genres?: string[];
  developer?: string | null;
  store_slug?: string | null;
  summary_hint?: string | null;
  is_favorite?: boolean;
  is_hidden?: boolean;
  collection_tag?: string | null;
  update_available?: boolean | null;
  launch?: LaunchConfig | null;
  install_uri?: string | null;
}

export interface PlayerReview {
  author: string;
  recommended: boolean;
  hours_played: string;
  date_posted: string;
  helpful_text: string;
  content: string;
}

export interface OnlineGameDetails {
  resolved_steam_appid?: number | null;
  short_description?: string | null;
  developers: string[];
  publishers: string[];
  genres?: string[];
  release_date?: string | null;
  metacritic_score?: number | null;
  protondb_tier?: string | null;
  protondb_total?: number | null;
  hero_url?: string | null;
  screenshots: string[];
  download_size_bytes?: number | null;
  install_size_bytes?: number | null;
  build_version?: string | null;
  cloud_saves_supported?: boolean | null;
  has_turkish: boolean;
  controller_support?: string | null;
  estimated_main_hours?: number | null;
  estimated_extra_hours?: number | null;
  estimated_completionist_hours?: number | null;
  live_players_ccu?: number | null;
  community_rating_percent?: number | null;
  minimum_requirements?: string | null;
  recommended_requirements?: string | null;
  linux_requirements?: string | null;
  reviews: PlayerReview[];
}

export interface DownloadTaskInfo {
  game_id: string;
  title: string;
  platform: Platform;
  target_dir: string;
  status: "downloading" | "paused" | "completed" | "failed";
  progress_percent: number;
  speed_text: string;
  eta_text: string;
  detail_text: string;
  updated_game?: UnifiedGame | null;
}

export interface InstallLocationOption {
  label: string;
  path: string;
  free_bytes: number;
  total_bytes: number;
}

export interface InstallGamePayload {
  game: UnifiedGame;
  mode: "platform" | "legendary_cli" | "locate";
  target_dir?: string | null;
}

export interface CustomGameInput {
  title: string;
  executable_path: string;
  args: string[];
  working_dir?: string | null;
  wine_prefix?: string | null;
}

export interface RunnerInfo {
  name: string;
  path: string;
  kind: "proton" | "wine" | string;
}

export interface StoreAuthStatus {
  steam_connected: boolean;
  steam_persona?: string | null;
  steam_id64?: string | null;
  epic_connected: boolean;
  epic_display_name?: string | null;
  gog_connected: boolean;
  gog_username?: string | null;
}

export interface AppSettings {
  player_name?: string | null;
  onboarding_completed: boolean;
  steam_api_key?: string | null;
  steam_id64_override?: string | null;
  sgdb_api_key?: string | null;
  default_install_dir?: string | null;
  default_prefix_dir?: string | null;
  custom_steam_root?: string | null;
  sync_epic_heroic: boolean;
  minimize_to_tray?: boolean;
  desktop_notifications?: boolean;
  auto_cloud_sync?: boolean;
  default_hook: HookProfile;
}

export interface RemoteRunnerRelease {
  tag_name: string;
  name: string;
  published_at: string;
  download_url: string;
  size_bytes: number;
  is_installed: boolean;
}

export interface RunnerInstallProgress {
  tag_name: string;
  percent: number;
  status_text: string;
  done: boolean;
}

export interface SaveBackupInfo {
  file_name: string;
  full_path: string;
  created_epoch: number;
  size_bytes: number;
}

export interface LaunchLogEntry {
  id: number;
  game_id: string;
  game_title: string;
  timestamp_epoch: number;
  command_repr: string;
  runner_used?: string | null;
  extreme_boost_active: boolean;
  exit_code?: number | null;
  output_tail: string;
}

export interface PerfBottleneckItem {
  id: string;
  severity: "critical" | "warning" | "ok" | string;
  title: string;
  detail: string;
  can_auto_fix: boolean;
}

export interface UltraPerfStatus {
  cpu_model: string;
  p_core_range?: string | null;
  e_core_range?: string | null;
  turbo_enabled?: boolean | null;
  current_governor: string;
  max_freq_mhz: number;
  dgpu_name?: string | null;
  has_hybrid_gpu: boolean;
  nvidia_powerd_active: boolean;
  split_lock_mitigate?: number | null;
  ram_total_mb: number;
  ram_available_mb: number;
  swap_used_mb: number;
  passwordless_boost_installed: boolean;
  cs2_installed: boolean;
  cs2_current_launch_options?: string | null;
  bottlenecks: PerfBottleneckItem[];
}

export interface SteamEsportsPresetPayload {
  appid: string;
  mode: "native_max_fps" | "gamescope_stretched";
  internal_w?: number | null;
  internal_h?: number | null;
  output_w?: number | null;
  output_h?: number | null;
  refresh_hz?: number | null;
  prefer_output?: string | null;
  restart_steam: boolean;
}

export interface DisplayOutputInfo {
  name: string;
  current_mode: string;
  current_rate: string;
  available_modes: string[];
  primary: boolean;
}

export interface SystemDiagnostics {
  session_type: string;
  detected_steam_root?: string | null;
  detected_steam_id64?: string | null;
  detected_heroic_config?: string | null;
  detected_lutris_db?: string | null;
  has_xrandr: boolean;
  has_gamescope: boolean;
  has_kscreen_doctor: boolean;
  has_gamemoderun: boolean;
  has_mangohud: boolean;
  displays: DisplayOutputInfo[];
  runners: RunnerInfo[];
}

export function createEmptyHookProfile(): HookProfile {
  return {
    enabled: false,
    display_backend: "auto",
    target_output: null,
    target_resolution: null,
    target_refresh_hz: null,
    use_gamemode: false,
    use_mangohud: false,
    gamescope_fsr: false,
    runner_path: null,
    custom_env: [],
    suspend_processes: [],
    pre_launch_cmd: null,
    post_exit_cmd: null,
  };
}

export function createDefaultAppSettings(): AppSettings {
  return {
    player_name: null,
    onboarding_completed: false,
    steam_api_key: null,
    steam_id64_override: null,
    sgdb_api_key: null,
    default_install_dir: null,
    default_prefix_dir: null,
    custom_steam_root: null,
    sync_epic_heroic: true,
    default_hook: createEmptyHookProfile(),
  };
}

export function platformLabel(platform: Platform): string {
  switch (platform) {
    case "steam":
      return "STEAM";
    case "epic":
      return "EPIC";
    case "gog":
      return "GOG";
    case "custom":
      return "ÖZEL";
  }
}

export function isLocalFilePath(pathOrUrl: string): boolean {
  return pathOrUrl.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(pathOrUrl);
}

export function resolveMediaSrc(pathOrUrl?: string | null): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  if (isLocalFilePath(pathOrUrl)) {
    return convertFileSrc(pathOrUrl, "sonsusmedia");
  }
  return pathOrUrl;
}

export function buildCoverCandidates(game: UnifiedGame, bustCacheKey?: number): string[] {
  const candidates: string[] = [];
  const suffix = bustCacheKey ? `?v=${bustCacheKey}` : "";

  const pushUnique = (url?: string | null) => {
    if (url && !candidates.includes(url)) {
      candidates.push(url);
    }
  };

  if (game.cover_path_or_url) {
    if (isLocalFilePath(game.cover_path_or_url)) {
      pushUnique(`${convertFileSrc(game.cover_path_or_url, "sonsusmedia")}${suffix}`);
      pushUnique(convertFileSrc(game.cover_path_or_url, "asset"));
    } else {
      pushUnique(game.cover_path_or_url);
    }
  }

  pushUnique(game.fallback_cover_url);

  if (game.platform === "steam") {
    pushUnique(
      `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.platform_id}/library_600x900.jpg`
    );
    pushUnique(
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.platform_id}/library_600x900.jpg`
    );
    pushUnique(
      `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.platform_id}/header.jpg`
    );
  }

  return candidates;
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function formatPlaytime(minutes: number): string {
  if (!minutes || minutes <= 0) return "";
  const hrs = minutes / 60;
  if (hrs < 1) return `${minutes} dk`;
  return `${hrs.toFixed(1)} sa`;
}

export function formatEpochDate(epoch?: number | null): string {
  if (!epoch || epoch <= 0) return "Henüz oynanmadı";
  const d = new Date(epoch * 1000);
  return d.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
