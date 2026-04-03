import React from 'react';
import { View } from 'react-native';
import type { ViewProps, ViewStyle } from 'react-native';

interface Point {
  x: number;
  y: number;
}

interface LinearGradientProps extends ViewProps {
  colors: (string | number)[];
  start?: Point;
  end?: Point;
  locations?: number[];
  useAngle?: boolean;
  angle?: number;
  angleCenter?: Point;
}

const DEFAULT_START: Point = { x: 0.5, y: 0 };
const DEFAULT_END: Point = { x: 0.5, y: 1 };

function resolveColor(color: string | number): string {
  if (typeof color === 'string') return color;
  const hex = (color & 0xFFFFFF).toString(16).padStart(6, '0');
  const alpha = ((color >>> 24) & 0xFF).toString(16).padStart(2, '0');
  return `#${hex}${alpha}`;
}

function toAngle(start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const rad = Math.atan2(dx, -dy);
  return (rad * 180) / Math.PI;
}

function buildGradient(colors: string[], locations?: number[], angle = 180): string {
  const stops = colors.map((color, i) => {
    const pos = locations?.[i];
    return pos !== undefined ? `${color} ${pos * 100}%` : color;
  });
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
}

function LinearGradient({
  colors, start, end, locations,
  useAngle: useAngleProp, angle: angleProp, angleCenter: _angleCenter,
  style,
  ...viewProps
}: LinearGradientProps) {
  const angle = useAngleProp && angleProp != null
    ? angleProp
    : toAngle(start ?? DEFAULT_START, end ?? DEFAULT_END);

  const cssColors = colors.map(resolveColor);

  return (
    <View
      {...viewProps}
      style={[style, { backgroundImage: buildGradient(cssColors, locations, angle) } as ViewStyle]}
    />
  );
}

export default LinearGradient;
export { LinearGradient };
