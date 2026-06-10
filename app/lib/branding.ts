/** App background — must match manifest `background_color` and critical CSS in `app/layout.tsx`. */
export const BRAND_PAGE_BG = '#0a0e17';

/**
 * Bump when regenerating PWA icons so browsers + SW pick up new assets.
 * Keep `public/sw.js` STATIC_ASSETS in sync with this value.
 */
export const ICON_ASSET_VERSION = '20260208';

export function iconSrc(size: 192 | 256 | 384 | 512): string {
  return `/icons/icon-${size}.png?v=${ICON_ASSET_VERSION}`;
}
