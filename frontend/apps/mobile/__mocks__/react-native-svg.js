const React = require('react');

const mockComponent = (name) => (props) =>
  React.createElement(name, props, props.children);

module.exports = {
  __esModule: true,
  default: mockComponent('Svg'),
  Svg: mockComponent('Svg'),
  Path: mockComponent('Path'),
  Circle: mockComponent('Circle'),
  Rect: mockComponent('Rect'),
  G: mockComponent('G'),
  Line: mockComponent('Line'),
  Defs: mockComponent('Defs'),
  ClipPath: mockComponent('ClipPath'),
  LinearGradient: mockComponent('LinearGradient'),
  Stop: mockComponent('Stop'),
};
