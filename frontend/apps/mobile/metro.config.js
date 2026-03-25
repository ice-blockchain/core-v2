const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const appNodeModules = path.resolve(projectRoot, 'node_modules');

const singletonPackages = {
  react: path.resolve(appNodeModules, 'react'),
  'react-native': path.resolve(appNodeModules, 'react-native'),
  'react-native-svg': path.resolve(appNodeModules, 'react-native-svg'),
};

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      appNodeModules,
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    extraNodeModules: singletonPackages,
    resolveRequest: (context, moduleName, platform) => {
      if (singletonPackages[moduleName]) {
        return {
          filePath: require.resolve(moduleName, { paths: [appNodeModules] }),
          type: 'sourceFile',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
