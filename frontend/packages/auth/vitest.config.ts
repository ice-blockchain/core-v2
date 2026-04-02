import path from 'node:path';
import { defineConfig } from 'vitest/config';

const configDir = path.resolve(__dirname, '../config/src/environment');

export default defineConfig({
  resolve: {
    alias: {
      [path.resolve(configDir, 'environment.ts')]: path.resolve(configDir, 'environment.web.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    env: {
      VITE_APP_ENV: 'staging',
      VITE_API_BASE_URL: 'https://test.local',
      VITE_IDENTITY_APP_ID: 'test-app',
      VITE_RELAY_URL: 'wss://test.local/relay',
      VITE_LOG_LEVEL: 'error',
    },
  },
});
