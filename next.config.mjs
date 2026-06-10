/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['html2canvas', 'jspdf', 'xlsx'],
  async headers() {
    return [
      {
        source: '/login',
        headers: [{ key: 'Cache-Control', value: 'private, no-cache, no-store, must-revalidate' }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/erp-api/:path*',
        destination: 'https://crown-api-756273570281.us-central1.run.app/api/:path*',
      },
    ];
  },
};

export default nextConfig;
