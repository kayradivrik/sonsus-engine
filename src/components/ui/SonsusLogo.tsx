import React from "react";

interface SonsusLogoProps {
  size?: number;
  className?: string;
}

/**
 * sonsus-engine için özel olarak tasarlanmış,
 * kinetik sonsuzluk motorunu ve e-spor geometrisini simgeleyen vektörel amblem.
 */
export const SonsusLogo: React.FC<SonsusLogoProps> = ({ size = 28, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 ${className}`}
    >
      <defs>
        {/* Keskin Çelik & Beyaz Işıma Gradyanı */}
        <linearGradient id="sonsus-blade" x1="2" y1="4" x2="34" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#E4E4E7" />
          <stop offset="100%" stopColor="#71717A" />
        </linearGradient>

        {/* İç Çekirdek Matrisi */}
        <linearGradient id="sonsus-core" x1="18" y1="8" x2="18" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#A1A1AA" />
        </linearGradient>
      </defs>

      {/* Dış Geometrik Kinetik Sonsuzluk Kanatları */}
      <path
        d="M5 12L13 4H23L31 12L22 20L31 28L23 32H13L5 24L14 16L5 12Z"
        stroke="url(#sonsus-blade)"
        strokeWidth="2.4"
        strokeLinejoin="miter"
        strokeLinecap="round"
      />

      {/* Merkez Enerji Kristali */}
      <polygon
        points="18,10 23,16 18,22 13,16"
        fill="url(#sonsus-core)"
      />

      {/* Merkez Odak Noktası */}
      <circle cx="18" cy="16" r="2" fill="#000000" />
    </svg>
  );
};

