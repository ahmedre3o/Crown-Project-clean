import { ImageResponse } from 'next/og';

const CROWN_PATH = 'M2 20 L4 14 L8 16 L12 5 L16 16 L20 14 L22 20 L2 20 Z';
const BRAND_CYAN = '#06b6d4';
const BRAND_BG = '#ffffff';

export function createCrownIcon(size: number) {
  const ringSize = Math.round(size * 0.78);
  const ringBorder = Math.max(3, Math.round(size * 0.04));
  const iconSize = Math.round(size * 0.46);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND_BG,
        }}
      >
        <div
          style={{
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            border: `${ringBorder}px solid ${BRAND_CYAN}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: BRAND_BG,
          }}
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={CROWN_PATH}
              stroke={BRAND_CYAN}
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
