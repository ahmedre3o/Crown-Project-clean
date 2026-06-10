const SHOP_ID_KEY = 'activeShopId';
const SHOP_ID_KEY_LEGACY = 'crown-active-shop-id';

export function getStoredShopId(): number | null {
  if (typeof window === 'undefined') return null;
  const rawPrimary = localStorage.getItem(SHOP_ID_KEY);
  const rawLegacy = localStorage.getItem(SHOP_ID_KEY_LEGACY);
  const primary = Number(rawPrimary ?? NaN);
  if (Number.isFinite(primary) && primary > 0) return primary;
  const legacy = Number(rawLegacy ?? NaN);
  if (Number.isFinite(legacy) && legacy > 0) return legacy;
  return null;
}

export function setStoredShopId(id: number | null): void {
  if (typeof window === 'undefined') return;
  const valid = Number.isFinite(id) && Number(id) > 0 ? String(id) : null;
  if (valid) {
    localStorage.setItem(SHOP_ID_KEY, valid);
    localStorage.setItem(SHOP_ID_KEY_LEGACY, valid);
  } else {
    localStorage.removeItem(SHOP_ID_KEY);
    localStorage.removeItem(SHOP_ID_KEY_LEGACY);
  }
  window.dispatchEvent(new Event('crown-shop-changed'));
}
