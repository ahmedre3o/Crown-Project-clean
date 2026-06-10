import React from 'react';

/**
 * Neon circuit crown matching the original brand style.
 */
export function CrownOutlineIcon({
  className = '',
  size = 24,
  'aria-hidden': ariaHidden = true,
}: {
  className?: string;
  size?: number;
  'aria-hidden'?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-cyan-300 ${className}`}
      aria-hidden={ariaHidden}
    >
      {/* Bowl + base highlight */}
      <ellipse cx="12" cy="19.1" rx="7.8" ry="1.2" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.9" />
      <path
        d="M4.6 18.1C6.3 17.4 8.9 17 12 17c3.1 0 5.7.4 7.4 1.1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Main crown frame */}
      <path
        d="M4.5 18.2L4.9 13.2L7.6 11.1L10 13.8L12 8.1L14 13.8L16.4 11.1L19.1 13.2L19.5 18.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />

      {/* Circuit branches */}
      <path d="M7.6 11.1V8.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.95" />
      <path d="M10 13.8V10.7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.95" />
      <path d="M12 8.1V5.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M14 13.8V10.7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.95" />
      <path d="M16.4 11.1V8.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.95" />

      {/* Node tips */}
      <circle cx="7.6" cy="8" r="0.85" fill="currentColor" />
      <circle cx="10" cy="10.1" r="0.75" fill="currentColor" />
      <circle cx="12" cy="5.1" r="1.05" fill="currentColor" />
      <circle cx="14" cy="10.1" r="0.75" fill="currentColor" />
      <circle cx="16.4" cy="8" r="0.85" fill="currentColor" />

      {/* Side traces */}
      <path d="M5.6 14.7H4.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <path d="M19.8 14.7H18.4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <path d="M6.3 12.8H4.7" stroke="currentColor" strokeWidth="0.95" strokeLinecap="round" opacity="0.7" />
      <path d="M19.3 12.8H17.7" stroke="currentColor" strokeWidth="0.95" strokeLinecap="round" opacity="0.7" />
      <path d="M4.2 14.7V13.9" stroke="currentColor" strokeWidth="0.95" strokeLinecap="round" opacity="0.7" />
      <path d="M19.8 14.7V13.9" stroke="currentColor" strokeWidth="0.95" strokeLinecap="round" opacity="0.7" />
      <path d="M4.7 12.8V12.1" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <path d="M19.3 12.8V12.1" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <circle cx="4.2" cy="13.9" r="0.45" fill="currentColor" opacity="0.8" />
      <circle cx="19.8" cy="13.9" r="0.45" fill="currentColor" opacity="0.8" />
      <circle cx="4.7" cy="12.1" r="0.4" fill="currentColor" opacity="0.75" />
      <circle cx="19.3" cy="12.1" r="0.4" fill="currentColor" opacity="0.75" />
      <path
        d="M7.6 11.1L6.1 13.4M10 13.8L8.6 15.9M14 13.8L15.4 15.9M16.4 11.1L17.9 13.4"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.65"
      />
      {/* Inner circuit + data ticks — match PNG / reference art */}
      <path
        d="M8.2 16.2V12.4M9.8 16.4V11.2M12 17V10M14.2 16.4V11.2M15.8 16.2V12.4"
        stroke="currentColor"
        strokeWidth="0.55"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M9.5 14.2L10.8 12.8M12.5 14.5L12 13M14.5 14.2L13.2 12.8"
        stroke="currentColor"
        strokeWidth="0.45"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path d="M10.2 4.2V2.8M12 3.6V1.9M13.8 4.2V2.8" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" opacity="0.55" />
      <circle cx="12" cy="1.5" r="0.35" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
