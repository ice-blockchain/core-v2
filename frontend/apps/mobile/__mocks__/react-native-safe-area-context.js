const React = require('react');

module.exports = {
  SafeAreaProvider: ({ children }) =>
    React.createElement('SafeAreaProvider', null, children),
  SafeAreaView: ({ children }) =>
    React.createElement('SafeAreaView', null, children),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
};
