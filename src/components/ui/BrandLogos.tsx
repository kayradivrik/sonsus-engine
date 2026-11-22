import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Microsoft Copilot Resmi Degrade Logo
 */
export const CopilotLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="copilot_g1" x1="8" y1="38" x2="32" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0B5CAD" />
        <stop offset="50%" stopColor="#0078D4" />
        <stop offset="100%" stopColor="#25D0AB" />
      </linearGradient>
      <linearGradient id="copilot_g2" x1="16" y1="40" x2="42" y2="14" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#D9383A" />
        <stop offset="35%" stopColor="#F25022" />
        <stop offset="70%" stopColor="#FF8C00" />
        <stop offset="100%" stopColor="#FFB900" />
      </linearGradient>
      <linearGradient id="copilot_g3" x1="24" y1="8" x2="44" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#8764B8" />
        <stop offset="50%" stopColor="#6B45A8" />
        <stop offset="100%" stopColor="#D9383A" />
      </linearGradient>
    </defs>
    {/* Sol / Alt Mavi-Yeşil Şerit */}
    <path
      d="M10 26.5C10 18.5 16.5 12 24.5 12C28.2 12 31.5 13.4 34 15.7L29.6 20.1C28.3 18.8 26.5 18 24.5 18C19.8 18 16 21.8 16 26.5C16 31.2 19.8 35 24.5 35H32V41H24.5C16.5 41 10 34.5 10 26.5Z"
      fill="url(#copilot_g1)"
    />
    {/* Sağ / Üst Mor-Turuncu Şerit */}
    <path
      d="M38 21.5C38 29.5 31.5 36 23.5 36C19.8 36 16.5 34.6 14 32.3L18.4 27.9C19.7 29.2 21.5 30 23.5 30C28.2 30 32 26.2 32 21.5C32 16.8 28.2 13 23.5 13H16V7H23.5C31.5 7 38 13.5 38 21.5Z"
      fill="url(#copilot_g2)"
    />
    <circle cx="24" cy="24" r="5" fill="url(#copilot_g3)" />
  </svg>
);

/**
 * Microsoft Edge Resmi Dalga/Swirl Logosu
 */
export const EdgeLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="edge_teal" x1="6" y1="24" x2="30" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0C80DF" />
        <stop offset="60%" stopColor="#00D2B4" />
        <stop offset="100%" stopColor="#13B44B" />
      </linearGradient>
      <linearGradient id="edge_blue" x1="12" y1="8" x2="42" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0078D4" />
        <stop offset="50%" stopColor="#004E8C" />
        <stop offset="100%" stopColor="#002D5A" />
      </linearGradient>
      <linearGradient id="edge_green" x1="18" y1="6" x2="38" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#30B85E" />
        <stop offset="50%" stopColor="#55D56E" />
        <stop offset="100%" stopColor="#00D2B4" />
      </linearGradient>
    </defs>
    {/* Arka Mavi Kavis */}
    <path
      d="M24 6C33.9 6 42 14.1 42 24C42 33.9 33.9 42 24 42C15.2 42 7.8 35.6 6.3 27C7.6 28.8 11.2 31 16 31C24.3 31 29 25.2 29 19.5C29 15.2 26.5 12.5 24 11C20.5 8.9 16.5 9 14.2 9.5C17.1 7.3 20.4 6 24 6Z"
      fill="url(#edge_blue)"
    />
    {/* Alt Yeşil/Mavi Dalga */}
    <path
      d="M6.3 27C6.1 26 6 25 6 24C6 14.8 13 7.3 22 6.2C17.5 8.1 14 11.8 14 16.5C14 22.8 19.5 27 26 27C30.5 27 34 25 36.5 22.5C37.5 24.5 38 27.2 37.5 30C35.5 37 29 42 21 42C14.5 42 9 37.5 7 32C6.5 30.5 6.3 28.8 6.3 27Z"
      fill="url(#edge_teal)"
    />
    {/* Ön Yeşil Işıma */}
    <path
      d="M24 11C27 12.8 29 16 29 19.5C29 23.5 26 27 21 27C17 27 14 24 14 19.5C14 14.5 18 11.5 24 11Z"
      fill="url(#edge_green)"
    />
  </svg>
);

/**
 * Xbox Resmi Yeşil Küre / X Logosu
 */
export const XboxLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <radialGradient id="xbox_radial" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#1BD81B" />
        <stop offset="50%" stopColor="#107C10" />
        <stop offset="100%" stopColor="#083E08" />
      </radialGradient>
      <linearGradient id="xbox_x_grad" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#E0E0E0" />
      </linearGradient>
    </defs>
    {/* Yeşil Küre */}
    <circle cx="24" cy="24" r="21" fill="url(#xbox_radial)" />
    {/* Xbox X Kesikleri */}
    <path
      d="M13.2 13.8C16.5 10 20.1 7.8 24 7.8C27.9 7.8 31.5 10 34.8 13.8C31.5 18.5 28 23 24 28.5C20 23 16.5 18.5 13.2 13.8Z"
      fill="url(#xbox_x_grad)"
    />
    <path
      d="M10.2 18.5C9.5 20.2 9.1 22 9.1 24C9.1 31.5 14.6 37.8 21.8 38.8C18.6 33.5 15 26.5 10.2 18.5Z"
      fill="url(#xbox_x_grad)"
    />
    <path
      d="M37.8 18.5C38.5 20.2 38.9 22 38.9 24C38.9 31.5 33.4 37.8 26.2 38.8C29.4 33.5 33 26.5 37.8 18.5Z"
      fill="url(#xbox_x_grad)"
    />
  </svg>
);

/**
 * Microsoft OneDrive Mavi Bulut Logosu
 */
export const OneDriveLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="onedrive_back" x1="10" y1="14" x2="36" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#005A9E" />
        <stop offset="100%" stopColor="#0078D4" />
      </linearGradient>
      <linearGradient id="onedrive_front" x1="16" y1="20" x2="42" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0078D4" />
        <stop offset="100%" stopColor="#28A8EA" />
      </linearGradient>
    </defs>
    {/* Arka Bulut */}
    <path
      d="M19 16C21.8 16 24.3 17.5 25.6 19.8C26.9 19.3 28.4 19 30 19C35.5 19 40 23.5 40 29C40 29.3 40 29.7 39.9 30C39.4 30 38.7 30 38 30C37.5 25 33.2 21 28 21C26.5 21 25.1 21.4 23.8 22.1C22.6 18.5 19.1 16 15 16C12.5 16 10.2 17 8.5 18.6C10.5 17 14.5 16 19 16Z"
      fill="url(#onedrive_back)"
    />
    {/* Ön Bulut */}
    <path
      d="M32 23C36.4 23 40 26.6 40 31C40 35.4 36.4 39 32 39H15C10.6 39 7 35.4 7 31C7 27.1 9.8 23.8 13.5 23.1C14.7 19.5 18.1 17 22 17C26.6 17 30.5 20.3 31.4 24.8C31.6 24.8 31.8 24.8 32 24.8V23Z"
      fill="url(#onedrive_front)"
    />
  </svg>
);

/**
 * Microsoft Bing / Web Arama Resmi Logosu
 */
export const BingLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="bing_g1" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#008373" />
        <stop offset="45%" stopColor="#00A4EF" />
        <stop offset="100%" stopColor="#0078D4" />
      </linearGradient>
      <linearGradient id="bing_g2" x1="20" y1="14" x2="38" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFB900" />
        <stop offset="100%" stopColor="#F25022" />
      </linearGradient>
    </defs>
    {/* İkonik Bing 'b' Origami Formu */}
    <path
      d="M13 7V37.5L23.5 43L35 36.5L35 25.5L25 21L19.5 23.5L19.5 14L13 7Z"
      fill="url(#bing_g1)"
    />
    <path
      d="M25 21L35 25.5L35 15.5L25 11.5L25 21Z"
      fill="url(#bing_g2)"
    />
  </svg>
);

/**
 * Cortana İkonik Çift Halka Logosu
 */
export const CortanaLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="cortana_grad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00BCF9" />
        <stop offset="50%" stopColor="#0078D7" />
        <stop offset="100%" stopColor="#002050" />
      </linearGradient>
    </defs>
    {/* Dış Halka */}
    <circle
      cx="24"
      cy="24"
      r="16"
      stroke="url(#cortana_grad)"
      strokeWidth="4.5"
      strokeLinecap="round"
      className="opacity-95"
    />
    {/* İç Işıltı Noktası */}
    <circle cx="24" cy="24" r="5" fill="#00BCF9" />
  </svg>
);

/**
 * Windows 11 Resmi 4-Mavi Kare Logosu (Telemetri / Teşhis)
 */
export const Windows11Logo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="7" y="7" width="15.5" height="15.5" rx="1.5" fill="#0078D4" />
    <rect x="25.5" y="7" width="15.5" height="15.5" rx="1.5" fill="#0078D4" />
    <rect x="7" y="25.5" width="15.5" height="15.5" rx="1.5" fill="#0078D4" />
    <rect x="25.5" y="25.5" width="15.5" height="15.5" rx="1.5" fill="#0078D4" />
  </svg>
);

/**
 * Windows 11 Widgets (Haberler, Hava Durumu & Pano) Logosu
 */
export const WidgetsLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="widget_blue" x1="6" y1="8" x2="26" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00A4EF" />
        <stop offset="100%" stopColor="#0078D4" />
      </linearGradient>
      <linearGradient id="widget_amber" x1="24" y1="8" x2="42" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFB900" />
        <stop offset="100%" stopColor="#F25022" />
      </linearGradient>
      <linearGradient id="widget_green" x1="24" y1="24" x2="42" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#107C10" />
        <stop offset="100%" stopColor="#25D0AB" />
      </linearGradient>
    </defs>
    {/* Sol Büyük Widget (Haberler) */}
    <rect x="6" y="8" width="16" height="32" rx="4" fill="url(#widget_blue)" />
    {/* Sağ Üst Widget (Hava Durumu) */}
    <rect x="26" y="8" width="16" height="14" rx="4" fill="url(#widget_amber)" />
    {/* Sağ Alt Widget (Borsa/Finans) */}
    <rect x="26" y="26" width="16" height="14" rx="4" fill="url(#widget_green)" />
  </svg>
);

/**
 * Xbox Game DVR / Game Bar Logosu
 */
export const GameDvrLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="gamedvr_grad" x1="8" y1="12" x2="40" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#107C10" />
        <stop offset="100%" stopColor="#0E600E" />
      </linearGradient>
    </defs>
    {/* Oyun Kolu Şekli */}
    <rect x="6" y="10" width="36" height="28" rx="8" fill="url(#gamedvr_grad)" />
    {/* D-Pad */}
    <path d="M14 21H18V17H20V21H24V23H20V27H18V23H14V21Z" fill="#FFFFFF" opacity="0.9" />
    {/* Kayıt / Video Noktası (Kırmızı DVRREC İndikatörü) */}
    <circle cx="33" cy="24" r="5" fill="#EF4444" />
    <circle cx="33" cy="24" r="2" fill="#FFFFFF" />
  </svg>
);

/**
 * Windows Telemetri & Güvenlik Kalkanı Logosu
 */
export const TelemetryShieldLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="shield_grad" x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#991B1B" />
      </linearGradient>
    </defs>
    {/* Kalkan Gövdesi */}
    <path
      d="M24 6L38 12V23.5C38 32.5 32 40 24 43C16 40 10 32.5 10 23.5V12L24 6Z"
      fill="url(#shield_grad)"
    />
    {/* İç Windows 4-Kare Kesiti */}
    <rect x="18" y="18" width="4.5" height="4.5" rx="0.8" fill="#FFFFFF" opacity="0.9" />
    <rect x="24.5" y="18" width="4.5" height="4.5" rx="0.8" fill="#FFFFFF" opacity="0.9" />
    <rect x="18" y="24.5" width="4.5" height="4.5" rx="0.8" fill="#FFFFFF" opacity="0.9" />
    <rect x="24.5" y="24.5" width="4.5" height="4.5" rx="0.8" fill="#FFFFFF" opacity="0.9" />
  </svg>
);

/**
 * Steam Resmi Vektörel Logosu
 */
export const SteamLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <radialGradient id="steam_grad" cx="40%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#1B2838" />
        <stop offset="50%" stopColor="#171A21" />
        <stop offset="100%" stopColor="#0B1015" />
      </radialGradient>
      <linearGradient id="steam_blue" x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#66C0F4" />
        <stop offset="100%" stopColor="#1999DF" />
      </linearGradient>
    </defs>
    <circle cx="24" cy="24" r="22" fill="url(#steam_grad)" stroke="#1999DF" strokeWidth="1.5" />
    <path d="M33 19C33 15.13 29.87 12 26 12C22.42 12 19.46 14.69 19.05 18.14L14.7 20.32C13.9 19.5 12.76 19 11.5 19C9.01 19 7 21.01 7 23.5C7 25.99 9.01 28 11.5 28C13.68 28 15.5 26.44 15.91 24.38L20.48 22.09C21.41 24.38 23.55 26 26 26C29.87 26 33 22.87 33 19ZM11.5 26.5C9.84 26.5 8.5 25.16 8.5 23.5C8.5 21.84 9.84 20.5 11.5 20.5C13.16 20.5 14.5 21.84 14.5 23.5C14.5 25.16 13.16 26.5 11.5 26.5ZM26 24.5C22.96 24.5 20.5 22.04 20.5 19C20.5 15.96 22.96 13.5 26 13.5C29.04 13.5 31.5 15.96 31.5 19C31.5 22.04 29.04 24.5 26 24.5Z" fill="url(#steam_blue)" />
  </svg>
);

/**
 * Discord Resmi İkonu
 */
export const DiscordLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="12" fill="#5865F2" />
    <path d="M35.5 14.5C33.2 13.4 30.7 12.6 28.1 12.2C28 12.5 27.8 12.9 27.6 13.3C24.8 12.9 22.1 12.9 19.3 13.3C19.1 12.9 18.9 12.5 18.8 12.2C16.2 12.6 13.7 13.4 11.4 14.5C6.7 21.5 5.5 28.3 6.1 35C9.2 37.3 12.2 38.7 15.1 39.6C15.8 38.6 16.5 37.6 17 36.5C15.9 36.1 14.9 35.6 13.9 34.9C14.2 34.7 14.4 34.5 14.7 34.3C20.5 37 26.6 37 32.3 34.3C32.6 34.5 32.8 34.7 33.1 34.9C32.1 35.6 31.1 36.1 30 36.5C30.5 37.6 31.2 38.6 31.9 39.6C34.8 38.7 37.8 37.3 40.9 35C41.6 27.2 39.5 20.5 35.5 14.5ZM17.7 30.7C16 30.7 14.6 29.1 14.6 27.2C14.6 25.3 15.9 23.7 17.7 23.7C19.5 23.7 20.8 25.3 20.8 27.2C20.7 29.1 19.4 30.7 17.7 30.7ZM29.3 30.7C27.6 30.7 26.2 29.1 26.2 27.2C26.2 25.3 27.5 23.7 29.3 23.7C31.1 23.7 32.4 25.3 32.4 27.2C32.4 29.1 31.1 30.7 29.3 30.7Z" fill="#FFFFFF" />
  </svg>
);

/**
 * Epic Games Resmi Çift Kalkan Logosu
 */
export const EpicGamesLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M7 6L24 2L41 6V30C41 38 24 46 24 46C24 46 7 38 7 30V6Z" fill="#202020" stroke="#FFFFFF" strokeWidth="2" />
    <path d="M24 8L36 11V27C36 33.5 24 39.5 24 39.5C24 39.5 12 33.5 12 27V11L24 8Z" fill="#313131" />
    <text x="24" y="27" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">EPIC</text>
  </svg>
);

/**
 * EA App Turuncu Çember Logosu
 */
export const EaAppLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="22" fill="#FF4747" />
    <text x="24" y="30" textAnchor="middle" fill="#FFFFFF" fontSize="18" fontWeight="900" fontFamily="sans-serif">EA</text>
  </svg>
);

/**
 * Battle.net Mavi Spiral Logo
 */
export const BattleNetLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="12" fill="#001428" stroke="#00AEFF" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="14" stroke="#00AEFF" strokeWidth="3" fill="none" strokeDasharray="18 6" />
    <circle cx="24" cy="24" r="6" fill="#00AEFF" />
  </svg>
);

/**
 * NVIDIA Resmi Yeşil Logo
 */
export const NvidiaLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="10" fill="#000000" stroke="#76B900" strokeWidth="1.5" />
    <path d="M24 13C17.9 13 13 17.9 13 24C13 30.1 17.9 35 24 35C28.2 35 31.8 32.6 33.6 29.1L29.5 27.2C28.3 29.1 26.3 30.3 24 30.3C20.5 30.3 17.7 27.5 17.7 24C17.7 20.5 20.5 17.7 24 17.7C26.5 17.7 28.6 19.1 29.7 21.2L33.8 19.3C31.9 15.5 28.2 13 24 13Z" fill="#76B900" />
    <circle cx="24" cy="24" r="3" fill="#76B900" />
  </svg>
);

/**
 * MSI Afterburner Logosu
 */
export const MsiAfterburnerLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="10" fill="#1A1A1A" stroke="#FF0000" strokeWidth="1.5" />
    <path d="M12 36L24 10L36 36H30L24 22L18 36H12Z" fill="#FF1A1A" />
    <circle cx="24" cy="28" r="4" fill="#FFA500" />
  </svg>
);

/**
 * OBS Studio Logo
 */
export const ObsLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="22" fill="#1E2328" stroke="#FFFFFF" strokeWidth="1.5" />
    <circle cx="20" cy="18" r="6" fill="#FFFFFF" />
    <circle cx="28" cy="18" r="6" fill="#FFFFFF" />
    <circle cx="24" cy="30" r="6" fill="#FFFFFF" />
  </svg>
);

/**
 * CPU-Z Logosu
 */
export const CpuZLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="10" fill="#0A3A60" stroke="#00C0FF" strokeWidth="1.5" />
    <text x="24" y="22" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">CPU</text>
    <text x="24" y="36" textAnchor="middle" fill="#00C0FF" fontSize="15" fontWeight="900" fontFamily="sans-serif">-Z</text>
  </svg>
);

/**
 * GPU-Z Logosu
 */
export const GpuZLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="10" fill="#1C3810" stroke="#76B900" strokeWidth="1.5" />
    <text x="24" y="22" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">GPU</text>
    <text x="24" y="36" textAnchor="middle" fill="#76B900" fontSize="15" fontWeight="900" fontFamily="sans-serif">-Z</text>
  </svg>
);

/**
 * 7-Zip Logosu
 */
export const SevenZipLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="8" fill="#FFFFFF" stroke="#CCCCCC" strokeWidth="1.5" />
    <rect x="8" y="10" width="32" height="28" rx="4" fill="#000000" />
    <text x="24" y="30" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="bold" fontFamily="monospace">7z</text>
  </svg>
);

/**
 * DirectX Logosu
 */
export const DirectXLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="10" fill="#0D1B2A" stroke="#3A86FF" strokeWidth="1.5" />
    <text x="24" y="25" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" fontFamily="sans-serif">DIRECT</text>
    <text x="24" y="38" textAnchor="middle" fill="#3A86FF" fontSize="16" fontWeight="900" fontFamily="sans-serif">X</text>
  </svg>
);

/**
 * Visual C++ Redistributable Logosu
 */
export const VcRedistLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="10" fill="#4C1D95" stroke="#A78BFA" strokeWidth="1.5" />
    <text x="24" y="24" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" fontFamily="sans-serif">VC++</text>
    <text x="24" y="37" textAnchor="middle" fill="#C4B5FD" fontSize="11" fontWeight="bold" fontFamily="sans-serif">REDIST</text>
  </svg>
);

/**
 * TeamSpeak Logosu
 */
export const TeamSpeakLogo: React.FC<LogoProps> = ({ className = "", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="22" fill="#2563EB" />
    <circle cx="24" cy="24" r="14" fill="#FFFFFF" />
    <circle cx="24" cy="24" r="8" fill="#1E40AF" />
  </svg>
);
