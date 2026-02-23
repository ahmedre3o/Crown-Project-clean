// رابط الاتصال بالباك إند اللي شغال على بورت 5001
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const TRIMMED_API_URL = RAW_API_URL.replace(/\/+$/, '');
export const API_BASE_URL = TRIMMED_API_URL.endsWith('/api')
  ? TRIMMED_API_URL
  : `${TRIMMED_API_URL}/api`;

// تعريف الباقات والصلاحيات
export const PACKAGES = {
  BRONZE: { id: 'bronze', name: 'الباقة البرونزية', maxUsers: 1 },
  SILVER: { id: 'silver', name: 'الباقة الفضية', maxUsers: 3 },
  GOLD: { id: 'gold', name: 'الباقة الذهبية', maxUsers: 999 }
};
