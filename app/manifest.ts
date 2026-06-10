import type { MetadataRoute } from 'next';
import { iconSrc } from '@/lib/branding';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Crown Services',
    short_name: 'Crown Services',
    description: 'Crown Services',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0a0e17',
    theme_color: '#06b6d4',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      { src: iconSrc(192), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: iconSrc(192), sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: iconSrc(256), sizes: '256x256', type: 'image/png', purpose: 'any' },
      { src: iconSrc(256), sizes: '256x256', type: 'image/png', purpose: 'maskable' },
      { src: iconSrc(384), sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: iconSrc(384), sizes: '384x384', type: 'image/png', purpose: 'maskable' },
      { src: iconSrc(512), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: iconSrc(512), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    categories: ['business', 'productivity'],
  };
}
