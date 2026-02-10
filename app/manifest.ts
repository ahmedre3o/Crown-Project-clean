import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Crown Services ERP',
    short_name: 'Crown ERP',
    description: 'SaaS POS, inventory, and business management for Crown Services',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#06b6d4',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    categories: ['business', 'productivity'],
  };
}
