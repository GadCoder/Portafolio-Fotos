import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rewriteAdminApiPath } from './lib/proxy';

const root = dirname(fileURLToPath(import.meta.url));
const apiOrigin = (process.env.ADMIN_API_ORIGIN ?? 'https://portfolio-api.gadcoder.com').replace(/\/$/, '');

export default defineConfig({
  root,
  plugins: [react()],
  server: {
    proxy: {
      '/admin-api': {
        target: apiOrigin,
        changeOrigin: true,
        rewrite: rewriteAdminApiPath,
      },
    },
  },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], restoreMocks: true },
  resolve: { alias: { '@': root } },
});
