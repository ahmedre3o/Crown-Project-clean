// Single source: lib/api.ts (NEXT_PUBLIC_API_URL; no localhost in production)
export { API_BASE_URL } from "../lib/api";

// تعريف الباقات والصلاحيات
export const PACKAGES = {
  BRONZE: { id: "bronze", name: "الباقة البرونزية", maxUsers: 1 },
  SILVER: { id: "silver", name: "الباقة الفضية", maxUsers: 3 },
  GOLD: { id: "gold", name: "الباقة الذهبية", maxUsers: 999 },
};
