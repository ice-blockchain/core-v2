import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const REQUIRED_ENV_VARS = [
  'VITE_APP_ENV',
  'VITE_API_BASE_URL',
  'VITE_RELAY_URL',
  'VITE_LOG_LEVEL',
] as const;

const webExtensions = [
  '.web.tsx',
  '.web.ts',
  '.web.js',
  '.tsx',
  '.ts',
  '.js',
];

const codegenShim = path.resolve(
  __dirname,
  'src/codegen-native-component-shim.ts',
);

function reactNativeWebPlugin(): Plugin {
  return {
    name: 'react-native-web',
    enforce: 'pre',
    config() {
      return {
        resolve: {
          extensions: webExtensions,
          alias: [
            {
              find: 'react-native/Libraries/Utilities/codegenNativeComponent',
              replacement: codegenShim,
            },
            {
              find: 'react-native',
              replacement: 'react-native-web',
            },
          ],
        },
        optimizeDeps: {
          include: ['react-native-web'],
          exclude: ['react-native'],
          resolve: {
            extensions: webExtensions,
            mainFields: ['browser', 'module', 'main'],
          },
          rolldownOptions: {
            resolve: {
              extensions: webExtensions,
              mainFields: ['browser', 'module', 'main'],
            },
          },
        },
      };
    },
  };
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), 'VITE_');
  const env: Record<string, string> = {};
  for (const key of REQUIRED_ENV_VARS) {
    env[key] = fileEnv[key] || process.env[key] || '';
  }

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
    plugins: [reactNativeWebPlugin(), react()],
    resolve: {
      alias: [
        {
          find: /^react$/,
          replacement: path.resolve(__dirname, 'node_modules/react'),
        },
        {
          find: /^react-dom$/,
          replacement: path.resolve(__dirname, 'node_modules/react-dom'),
        },
        {
          find: '@',
          replacement: path.resolve(__dirname, './src'),
        },
      ],
      dedupe: ['react', 'react-dom'],
    },
    define,
  };
});
