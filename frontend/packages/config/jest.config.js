module.exports = {
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      { presets: ['@babel/preset-env', '@babel/preset-typescript'] },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!react-native-config)'],
  testPathIgnorePatterns: ['src/remote-config/'],
  testEnvironment: 'node',
};
