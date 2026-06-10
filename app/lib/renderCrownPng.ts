import sharp from 'sharp';
import { buildCircuitCrownSvgDocument } from '@/lib/circuitCrownSvg';

export async function renderCrownPng(size: number): Promise<Buffer> {
  const svg = buildCircuitCrownSvgDocument(size);
  return sharp(Buffer.from(svg, 'utf-8'))
    .resize(size, size, { fit: 'fill' })
    .png({ compressionLevel: 9, effort: 9 })
    .toBuffer();
}
