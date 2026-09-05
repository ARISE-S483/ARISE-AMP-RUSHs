import React from 'react';

interface SimpLogoProps {
  className?: string;
  size?: number;
  monochrome?: boolean;
}

/**
 * SimpMusic Brand Icon
 * Inspired by SimpMusic's official heart-and-wave musical emblem
 */
export function SimpLogo({ className = '', size = 28, monochrome = false }: SimpLogoProps) {
  const gradientId = React.useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8ECAE6" />
          <stop offset="50%" stopColor="#219EBC" />
          <stop offset="100%" stopColor="#023047" />
        </linearGradient>
        <filter id={`${gradientId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8ECAE6" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Rounded squircle backdrop */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="13"
        fill={monochrome ? 'currentColor' : `url(#${gradientId})`}
        filter={monochrome ? undefined : `url(#${gradientId}-glow)`}
      />

      {/* Musical wave & heart mark */}
      <path
        d="M14 26C14 22 17 19 21 19C23.2 19 24.5 20.2 25 21.2C25.5 20.2 26.8 19 29 19C33 19 36 22 36 26C36 30.5 31 34.5 25 38C19 34.5 14 30.5 14 26Z"
        fill="white"
        fillOpacity="0.2"
      />
      {/* Dynamic Sound Wave Bars intersecting the emblem */}
      <rect x="17" y="24" width="2.5" height="8" rx="1.25" fill="white" />
      <rect x="21" y="20" width="2.5" height="15" rx="1.25" fill="white" />
      <rect x="25" y="16" width="2.5" height="19" rx="1.25" fill="white" />
      <rect x="29" y="21" width="2.5" height="13" rx="1.25" fill="white" />
      <rect x="33" y="25" width="2.5" height="6" rx="1.25" fill="white" />
    </svg>
  );
}
