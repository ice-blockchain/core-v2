import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const stubsDir = path.resolve(__dirname, 'src/stubs');

const REQUIRED_ENV_VARS = [
  'VITE_APP_ENV',
  'VITE_API_BASE_URL',
  'VITE_IDENTITY_APP_ID',
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
    config(_, { command }) {
      const rnwReplacement =
        command === 'build'
          ? path.resolve(__dirname, 'node_modules/react-native-web')
          : 'react-native-web';

      return {
        resolve: {
          extensions: webExtensions,
          alias: [
            {
              find: 'react-native/Libraries/Utilities/codegenNativeComponent',
              replacement: codegenShim,
            },
            {
              find: 'react-native/Libraries/TurboModule/TurboModuleRegistry',
              replacement: path.join(stubsDir, 'TurboModuleRegistry.ts'),
            },
            {
              find: /react-native\/src\/private\/devsupport\/rndevtools\/ReactDevToolsSettingsManager/,
              replacement: path.join(stubsDir, 'ReactDevToolsSettingsManager.ts'),
            },
            {
              find: 'react-native',
              replacement: rnwReplacement,
            },
            {
              find: /^react-native-svg$/,
              replacement: path.resolve(stubsDir, 'react-native-svg.tsx'),
            },
            {
              find: /^react-native-safe-area-context$/,
              replacement: path.join(stubsDir, 'react-native-safe-area-context.tsx'),
            },
            {
              find: /^react-native-linear-gradient$/,
              replacement: path.resolve(stubsDir, 'react-native-linear-gradient.tsx'),
            },
          ],
        },
        optimizeDeps: {
          include: [
            'react-native-web',
            'react-native-screens',
            'react-native-gesture-handler',
            'react-native-reanimated',
            '@gorhom/bottom-sheet',
            '@gorhom/portal',
          ],
          exclude: [
            'react-native',
            'react-native-svg',
            'react-native-safe-area-context',
            'react-native-linear-gradient',
          ],
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

export default defineConfig(({ mode, command }) => {
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

  const isDev = command === 'serve';
  const define: Record<string, string> = {};
  define['__DEV__'] = JSON.stringify(isDev);
  for (const key of REQUIRED_ENV_VARS) {
    define[`process.env.${key}`] = JSON.stringify(env[key]);
  }
  if (isDev) {
    define['process.env.VITE_API_BASE_URL'] = JSON.stringify('');
  }

  return {
    plugins: [
      reactNativeWebPlugin(),
      react({
        babel: {
          plugins: ['react-native-worklets/plugin'],
        },
      }),
    ],
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
      conditions: ['web'],
      dedupe: ['react', 'react-dom'],
    },
    define,
    server: {
      proxy: {
        '/v1': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
        },
      },
    },
  };
});
