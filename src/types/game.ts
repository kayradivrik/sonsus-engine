import { convertFileSrc } from "@tauri-apps/api/core";

export type Platform = "steam" | "epic" | "gog";
export type InstallStatus = "installed" | "cloud";
export type DisplayBackend = "auto" | "xrandr" | "gamescope" | "kscreen";
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

export interface AppSettings {
  steam_api_key?: string | null;
  steam_id64_override?: string | null;
  sgdb_api_key?: string | null;
  default_install_dir?: string | null;
  default_prefix_dir?: string | null;
  custom_steam_root?: string | null;
  sync_epic_heroic: boolean;
  default_hook: HookProfile;
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
  displays: DisplayOutputInfo[];
}

export function createEmptyHookProfile(): HookProfile {
  return {
    enabled: false,
    display_backend: "auto",
    target_output: null,
    target_resolution: null,
    target_refresh_hz: null,
    use_gamemode: false,
    suspend_processes: [],
    pre_launch_cmd: null,
    post_exit_cmd: null,
  };
}

export function createDefaultAppSettings(): AppSettings {
  return {
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
