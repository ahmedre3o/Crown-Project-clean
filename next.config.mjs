/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['html2canvas', 'jspdf', 'xlsx'],
  async rewrites() {
    return [
      { source: '/erp-api/:path*', destination: '/api/erp/:path*' },
    ];
  },
  allowedDevOrigins: [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'https://3001-*.cloudshell.dev',
    'https://*.cloudshell.dev',
  ],
};

export default nextConfig;
