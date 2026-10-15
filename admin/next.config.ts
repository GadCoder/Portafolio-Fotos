import type { NextConfig } from 'next';

const apiOrigin = (process.env.ADMIN_API_ORIGIN ?? 'https://portfolio-api.gadcoder.com').replace(/\/$/, '');
const config: NextConfig = {
  output: 'standalone',
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [{ source: '/admin-api/:path*', destination: `${apiOrigin}/admin/api/:path*` }];
  },
};
export default config;
