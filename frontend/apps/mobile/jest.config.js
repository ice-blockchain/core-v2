const path = require('path');

module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|@react-native|react-native|@react-native-community)/)',
  ],
  moduleNameMapper: {
    '^react$': path.resolve(__dirname, 'node_modules/react'),
    '^react/(.*)$': path.resolve(__dirname, 'node_modules/react/$1'),
    'react-native-svg': '<rootDir>/__mocks__/react-native-svg.js',
    'react-native-safe-area-context': '<rootDir>/__mocks__/react-native-safe-area-context.js',
  },
};
