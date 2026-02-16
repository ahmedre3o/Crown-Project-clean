// Use env at build time; dev fallback only (production must set NEXT_PUBLIC_API_URL)
export const API_BASE_URL =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "http://localhost:5001/api";

// تعريف الباقات والصلاحيات
export const PACKAGES = {
  BRONZE: { id: 'bronze', name: 'الباقة البرونزية', maxUsers: 1 },
  SILVER: { id: 'silver', name: 'الباقة الفضية', maxUsers: 3 },
  GOLD: { id: 'gold', name: 'الباقة الذهبية', maxUsers: 999 }
};
