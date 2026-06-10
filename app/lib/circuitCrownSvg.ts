/**
 * Single source for the circuit-crown artwork (viewBox 0 0 24 24).
 * Used for PNG icons via sharp — avoids @vercel/og ImageResponse mangling SVG strokes.
 */
export const CIRCUIT_CROWN_BG = '#0a0f18';
export const CIRCUIT_CROWN_CYAN = '#22d3ee';

/** Full SVG document scaled to `size` px (square). */
export function buildCircuitCrownSvgDocument(size: number): string {
  const { BG, C } = { BG: CIRCUIT_CROWN_BG, C: CIRCUIT_CROWN_CYAN };
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <rect width="24" height="24" fill="${BG}"/>
  <ellipse cx="12" cy="19.1" rx="7.8" ry="1.2" stroke="${C}" stroke-width="1.2" fill="none" opacity="0.9"/>
  <path d="M4.6 18.1C6.3 17.4 8.9 17 12 17c3.1 0 5.7.4 7.4 1.1" stroke="${C}" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.85"/>
  <path d="M4.5 18.2L4.9 13.2L7.6 11.1L10 13.8L12 8.1L14 13.8L16.4 11.1L19.1 13.2L19.5 18.2" stroke="${C}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
  <path d="M7.6 11.1V8.6M10 13.8V10.7M12 8.1V5.7M14 13.8V10.7M16.4 11.1V8.6" stroke="${C}" stroke-width="1.1" stroke-linecap="round" opacity="0.95"/>
  <circle cx="7.6" cy="8" r="0.85" fill="${C}"/>
  <circle cx="10" cy="10.1" r="0.75" fill="${C}"/>
  <circle cx="12" cy="5.1" r="1.05" fill="${C}"/>
  <circle cx="14" cy="10.1" r="0.75" fill="${C}"/>
  <circle cx="16.4" cy="8" r="0.85" fill="${C}"/>
  <path d="M5.6 14.7H4.2M19.8 14.7H18.4M6.3 12.8H4.7M19.3 12.8H17.7" stroke="${C}" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
  <path d="M4.2 14.7V13.9M19.8 14.7V13.9M4.7 12.8V12.1M19.3 12.8V12.1" stroke="${C}" stroke-width="0.95" stroke-linecap="round" opacity="0.7"/>
  <circle cx="4.2" cy="13.9" r="0.45" fill="${C}" opacity="0.8"/>
  <circle cx="19.8" cy="13.9" r="0.45" fill="${C}" opacity="0.8"/>
  <circle cx="4.7" cy="12.1" r="0.4" fill="${C}" opacity="0.75"/>
  <circle cx="19.3" cy="12.1" r="0.4" fill="${C}" opacity="0.75"/>
  <path d="M7.6 11.1L6.1 13.4M10 13.8L8.6 15.9M14 13.8L15.4 15.9M16.4 11.1L17.9 13.4" stroke="${C}" stroke-width="0.9" stroke-linecap="round" opacity="0.65"/>
  <!-- Inner circuit fill (image 3 style) -->
  <path d="M8.2 16.2V12.4M9.8 16.4V11.2M12 17V10M14.2 16.4V11.2M15.8 16.2V12.4" stroke="${C}" stroke-width="0.55" stroke-linecap="round" opacity="0.45"/>
  <path d="M9.5 14.2L10.8 12.8M12.5 14.5L12 13M14.5 14.2L13.2 12.8" stroke="${C}" stroke-width="0.45" stroke-linecap="round" opacity="0.4"/>
  <!-- Data ticks above center peak -->
  <path d="M10.2 4.2V2.8M12 3.6V1.9M13.8 4.2V2.8" stroke="${C}" stroke-width="0.5" stroke-linecap="round" opacity="0.55"/>
  <circle cx="12" cy="1.5" r="0.35" fill="${C}" opacity="0.6"/>
</svg>`;
}
