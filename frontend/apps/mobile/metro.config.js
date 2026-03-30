const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

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
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
