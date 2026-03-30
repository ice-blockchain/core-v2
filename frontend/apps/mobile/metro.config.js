const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const mobileModules = path.resolve(projectRoot, 'node_modules');

// Pre-resolve singleton modules to the mobile app's copies.
// This prevents duplicate instances in pnpm monorepos.
const singletonNames = [
  'react',
  'react-native',
  'react-native-safe-area-context',
  'react-native-svg',
  'react-native-gesture-handler',
  'react-native-reanimated',
  // Keep native view managers sourced from one module instance in the monorepo.
  'lottie-react-native',
];
const singletonPaths = {};
for (const name of singletonNames) {
  singletonPaths[name] = path.resolve(require.resolve(name, { paths: [mobileModules] }));
}

const IMAGE_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

function getWorkspaceAssetPath(url) {
  if (!url) return null;

  const [rawPath] = url.split('?');
  const decodedPath = (() => {
    try {
      return decodeURIComponent(rawPath);
    } catch {
      return rawPath;
    }
  })();

  // Normalize traversal in Metro asset URLs from monorepo packages:
  // /assets/../../packages/pkg/src/assets/img@3x.png -> /packages/pkg/src/assets/img@3x.png
  const normalizedPath = path.posix.normalize(decodedPath);
  if (!normalizedPath.startsWith('/packages/')) {
    return null;
  }

  const ext = path.extname(normalizedPath).slice(1).toLowerCase();
  if (!IMAGE_MIME[ext]) {
    return null;
  }

  return {
    absPath: path.join(workspaceRoot, normalizedPath),
    contentType: IMAGE_MIME[ext],
  };
}

// Packages that need directory-level singleton (complex packages with internal imports).
// Maps to the package directory so Metro resolves internal files correctly.
const directorySingletonNames = [
  '@gorhom/bottom-sheet',
  '@gorhom/portal',
];
const directorySingletons = {};
for (const name of directorySingletonNames) {
  const pkgJson = require.resolve(name + '/package.json', { paths: [mobileModules] });
  directorySingletons[name] = path.dirname(pkgJson);
}

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    assetExts: [...getDefaultConfig(__dirname).resolver.assetExts, 'tflite'],
    nodeModulesPaths: [
      mobileModules,
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      if (singletonPaths[moduleName]) {
        return { type: 'sourceFile', filePath: singletonPaths[moduleName] };
      }
      // Subpath match: e.g. 'react-native/Libraries/...'
      // Resolve from the mobile app's node_modules to prevent pnpm
      // from bundling duplicate react-native instances.
      for (const name of singletonNames) {
        if (moduleName.startsWith(name + '/')) {
          return context.resolveRequest(
            { ...context, originModulePath: path.join(mobileModules, '.placeholder.js') },
            moduleName,
            platform,
          );
        }
      }
      for (const [pkgName, pkgDir] of Object.entries(directorySingletons)) {
        if (moduleName === pkgName || moduleName.startsWith(pkgName + '/')) {
          return context.resolveRequest(
            { ...context, originModulePath: path.join(pkgDir, 'index.js') },
            moduleName,
            platform,
          );
        }
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
  server: {
    enhanceMiddleware(middleware) {
      return (req, res, next) => {
        const workspaceAsset = getWorkspaceAssetPath(req.url);
        if (workspaceAsset) {
          try {
            const content = fs.readFileSync(workspaceAsset.absPath);
            res.setHeader('Content-Type', workspaceAsset.contentType);
            res.end(content);
            return;
          } catch {
            // File not found, fall through to Metro middleware.
          }
        }
        return middleware(req, res, next);
      };
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
