import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], restoreMocks: true },
  resolve: { alias: { '@': path.resolve(__dirname) } },
});
