import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react()],
    resolve: {
      extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
      alias: {
        'react-native': path.dirname(require.resolve('react-native-web/package.json')),
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env.VITE_APP_ENV': JSON.stringify(env.VITE_APP_ENV),
      'process.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
      'process.env.VITE_RELAY_URL': JSON.stringify(env.VITE_RELAY_URL),
      'process.env.VITE_LOG_LEVEL': JSON.stringify(env.VITE_LOG_LEVEL),
    },
  };
});
