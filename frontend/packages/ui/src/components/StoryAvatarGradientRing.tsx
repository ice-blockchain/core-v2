import { useMemo } from "react";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import type { GradientStop } from "../tokens/gradients";

interface GradientRingProps {
  size: number;
  borderRadius: number;
  ringWidth: number;
  stops: GradientStop[];
  scale: (n: number) => number;
}

export function StoryAvatarGradientRing({ size, borderRadius, ringWidth, stops, scale }: GradientRingProps) {
  const scaledSize = scale(size);
  const scaledRadius = scale(borderRadius);
  const scaledRing = scale(ringWidth);
  const halfRing = scaledRing / 2;

  const stopElements = useMemo(
    () => stops.map((stop, index) => <Stop key={index} offset={stop.position} stopColor={stop.color} />),
    [stops],
  );

  return (
    <Svg width={scaledSize} height={scaledSize} style={{ position: "absolute" }}>
      <Defs>
        <LinearGradient id="storyRingGradient" x1="0" y1="0" x2="1" y2="1">
          {stopElements}
        </LinearGradient>
      </Defs>
      <Rect
        x={halfRing}
        y={halfRing}
        width={scaledSize - scaledRing}
        height={scaledSize - scaledRing}
        rx={scaledRadius - halfRing}
        ry={scaledRadius - halfRing}
        stroke="url(#storyRingGradient)"
        strokeWidth={scaledRing}
        fill="none"
      />
    </Svg>
  );
}
