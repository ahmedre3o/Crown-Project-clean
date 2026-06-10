import { iconSrc } from '@/lib/branding';

export default function Head() {
  return (
    <>
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="theme-color" content="#06b6d4" />
      <link rel="apple-touch-icon" href={iconSrc(192)} />
      <link rel="icon" type="image/png" sizes="192x192" href={iconSrc(192)} />
      <link rel="icon" type="image/png" sizes="512x512" href={iconSrc(512)} />
    </>
  );
}
