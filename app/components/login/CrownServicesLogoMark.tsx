import React from 'react';

type CrownServicesLogoMarkProps = {
  className?: string;
  /** 'lg' = login header, 'sm' = inline cards */
  size?: 'sm' | 'md' | 'lg';
};

/**
 * Minimal CS monogram: two angular strokes (C + S) intersecting — white mark, cyan glow via parent.
 */
export function CrownServicesLogoMark({ className = '', size = 'md' }: CrownServicesLogoMarkProps) {
  const dim = size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <svg
      className={`${dim} shrink-0 text-white ${className}`}
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Angular C — vertical spine + top & bottom arms */}
      <path d="M6 8 L6 40 L22 40 L22 32 L14 32 L14 16 L22 16 L22 8 Z" />
      {/* Angular S — interlocking stepped stroke */}
      <path d="M26 8 L42 8 L42 16 L32 16 L32 22 L42 22 L42 40 L26 40 L26 32 L36 32 L36 26 L26 26 L26 8 Z" />
    </svg>
  );
}
