import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const REQUIRED_ENV_VARS = [
  'VITE_APP_ENV',
  'VITE_API_BASE_URL',
  'VITE_RELAY_URL',
  'VITE_LOG_LEVEL',
] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  const missing = REQUIRED_ENV_VARS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing env vars: ${missing.join(', ')}. ` +
        'Ensure .env exists in apps/web/ (run scripts/setup-env.sh <env>).',
    );
  }

  const define: Record<string, string> = {};
  for (const key of REQUIRED_ENV_VARS) {
    define[`process.env.${key}`] = JSON.stringify(env[key]);
  }

  return {
    plugins: [react()],
    resolve: {
      extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
      alias: {
        'react-native': path.dirname(
          require.resolve('react-native-web/package.json'),
        ),
        '@': path.resolve(__dirname, './src'),
      },
    },
    define,
  };
});
