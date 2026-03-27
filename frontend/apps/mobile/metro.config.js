const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const mobileModules = path.resolve(projectRoot, 'node_modules');

// Pre-resolve singleton modules to the mobile app's copies.
// This prevents duplicate instances in pnpm monorepos.
const singletonNames = ['react', 'react-native', 'react-native-safe-area-context', 'react-native-svg'];
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

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      mobileModules,
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      if (singletonPaths[moduleName]) {
        return { type: 'sourceFile', filePath: singletonPaths[moduleName] };
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
