import { renderCrownPng } from '@/lib/renderCrownPng';

export const runtime = 'nodejs';

export async function GET() {
  const buffer = await renderCrownPng(256);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
