use serde::{Deserialize, Serialize};
use std::path::PathBuf;

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Steam,
    Epic,
    Gog,
}

impl Platform {
    pub fn as_str(&self) -> &'static str {
        match self {
            Platform::Steam => "steam",
            Platform::Epic => "epic",
            Platform::Gog => "gog",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InstallStatus {
    Installed,
    Cloud,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DisplayBackend {
    Auto,
    Xrandr,
    Gamescope,
    Kscreen,
}

impl Default for DisplayBackend {
    fn default() -> Self {
        Self::Auto
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchConfig {
    pub command_uri_or_bin: String,
    pub args: Vec<String>,
    pub working_dir: Option<PathBuf>,
    pub wine_prefix: Option<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookProfile {
    pub enabled: bool,
    #[serde(default)]
    pub display_backend: DisplayBackend,
    pub target_output: Option<String>,
    pub target_resolution: Option<String>,
    pub target_refresh_hz: Option<String>,
    #[serde(default)]
    pub use_gamemode: bool,
    #[serde(default)]
    pub suspend_processes: Vec<String>,
    pub pre_launch_cmd: Option<String>,
    pub post_exit_cmd: Option<String>,
}

impl Default for HookProfile {
    fn default() -> Self {
        Self {
            enabled: false,
            display_backend: DisplayBackend::Auto,
            target_output: None,
            target_resolution: None,
            target_refresh_hz: None,
            use_gamemode: false,
            suspend_processes: Vec::new(),
            pre_launch_cmd: None,
            post_exit_cmd: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedGame {
    pub id: String,
    pub platform_id: String,
    pub platform: Platform,
    pub title: String,
    pub status: InstallStatus,
    pub install_path: Option<PathBuf>,
    pub size_bytes: Option<u64>,
    pub playtime_minutes: u64,
    pub last_played_epoch: Option<i64>,
    pub cover_path_or_url: Option<String>,
    #[serde(default)]
    pub fallback_cover_url: Option<String>,
    pub hero_path_or_url: Option<String>,
    #[serde(default)]
    pub genres: Vec<String>,
    pub launch: Option<LaunchConfig>,
    pub install_uri: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerReview {
    pub author: String,
    pub recommended: bool,
    pub hours_played: String,
    pub date_posted: String,
    pub helpful_text: String,
    pub content: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct OnlineGameDetails {
    pub resolved_steam_appid: Option<u64>,
    pub short_description: Option<String>,
    pub developers: Vec<String>,
    pub publishers: Vec<String>,
    pub release_date: Option<String>,
    pub metacritic_score: Option<u32>,
    pub protondb_tier: Option<String>,
    pub protondb_total: Option<u32>,
    pub hero_url: Option<String>,
    pub screenshots: Vec<String>,
    #[serde(default)]
    pub download_size_bytes: Option<u64>,
    #[serde(default)]
    pub install_size_bytes: Option<u64>,
    #[serde(default)]
    pub build_version: Option<String>,
    #[serde(default)]
    pub cloud_saves_supported: Option<bool>,
    #[serde(default)]
    pub has_turkish: bool,
    #[serde(default)]
    pub controller_support: Option<String>,
    pub minimum_requirements: Option<String>,
    #[serde(default)]
    pub recommended_requirements: Option<String>,
    #[serde(default)]
    pub linux_requirements: Option<String>,
    pub reviews: Vec<PlayerReview>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallLocationOption {
    pub label: String,
    pub path: String,
    pub free_bytes: u64,
    pub total_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallGamePayload {
    pub game: UnifiedGame,
    pub mode: String, // "platform" | "legendary_cli" | "locate"
    pub target_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub steam_api_key: Option<String>,
    pub steam_id64_override: Option<String>,
    pub sgdb_api_key: Option<String>,
    #[serde(default)]
    pub default_install_dir: Option<String>,
    #[serde(default)]
    pub default_prefix_dir: Option<String>,
    #[serde(default)]
    pub custom_steam_root: Option<String>,
    #[serde(default = "default_true")]
    pub sync_epic_heroic: bool,
    #[serde(default)]
    pub default_hook: HookProfile,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            steam_api_key: None,
            steam_id64_override: None,
            sgdb_api_key: None,
            default_install_dir: None,
            default_prefix_dir: None,
            custom_steam_root: None,
            sync_epic_heroic: true,
            default_hook: HookProfile::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayOutputInfo {
    pub name: String,
    pub current_mode: String,
    pub current_rate: String,
    pub available_modes: Vec<String>,
    primary: bool,
}

impl DisplayOutputInfo {
    pub fn new(
        name: String,
        current_mode: String,
        current_rate: String,
        available_modes: Vec<String>,
        primary: bool,
    ) -> Self {
        Self {
            name,
            current_mode,
            current_rate,
            available_modes,
            primary,
        }
    }

    pub fn is_primary(&self) -> bool {
        self.primary
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemDiagnostics {
    pub session_type: String,
    pub detected_steam_root: Option<String>,
    pub detected_steam_id64: Option<String>,
    pub detected_heroic_config: Option<String>,
    pub detected_lutris_db: Option<String>,
    pub has_xrandr: bool,
    pub has_gamescope: bool,
    pub has_kscreen_doctor: bool,
    pub has_gamemoderun: bool,
    pub displays: Vec<DisplayOutputInfo>,
}
