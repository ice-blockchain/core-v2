import { useEffect, useMemo, useRef } from "react";
import { Animated, View } from "react-native";
import type { ViewStyle } from "react-native";
import { useTheme } from "@ion/ui";

function buildRowStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor,
    borderRadius: scale(16),
    padding: scale(12),
  };
}

function buildCircleStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(10),
    backgroundColor,
  };
}

function buildLineStyle(scale: (n: number) => number, width: number, backgroundColor: string): ViewStyle {
  return {
    width: scale(width),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor,
  };
}

function buildButtonStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    width: scale(80),
    height: scale(28),
    borderRadius: scale(16),
    backgroundColor,
  };
}

function buildLeftStyle(scale: (n: number) => number): ViewStyle {
  return { flexDirection: "row", alignItems: "center", gap: scale(10) };
}

function buildLinesStyle(scale: (n: number) => number): ViewStyle {
  return { gap: scale(6) };
}

function SkeletonRow({ animatedOpacity }: { animatedOpacity: Animated.Value }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const shimmerColor = theme.colors.secondaryBackground;

  const rowStyle = useMemo(() => buildRowStyle(scale, theme.colors.tertiaryBackground), [scale, theme.colors.tertiaryBackground]);
  const leftStyle = useMemo(() => buildLeftStyle(scale), [scale]);
  const linesStyle = useMemo(() => buildLinesStyle(scale), [scale]);
  const circleStyle = useMemo(() => buildCircleStyle(scale, shimmerColor), [scale, shimmerColor]);
  const nameLineStyle = useMemo(() => buildLineStyle(scale, 100, shimmerColor), [scale, shimmerColor]);
  const handleLineStyle = useMemo(() => buildLineStyle(scale, 70, shimmerColor), [scale, shimmerColor]);
  const buttonStyle = useMemo(() => buildButtonStyle(scale, shimmerColor), [scale, shimmerColor]);

  return (
    <View style={rowStyle}>
      <View style={leftStyle}>
        <Animated.View style={[circleStyle, { opacity: animatedOpacity }]} />
        <View style={linesStyle}>
          <Animated.View style={[nameLineStyle, { opacity: animatedOpacity }]} />
          <Animated.View style={[handleLineStyle, { opacity: animatedOpacity }]} />
        </View>
      </View>
      <Animated.View style={[buttonStyle, { opacity: animatedOpacity }]} />
    </View>
  );
}

const SKELETON_COUNT = 5;
const SKELETON_KEYS = Array.from({ length: SKELETON_COUNT }, (_, i) => `skeleton-${i}`);

export function CreatorRowSkeletonList() {
  const animatedOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(animatedOpacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [animatedOpacity]);

  return (
    <>
      {SKELETON_KEYS.map((key) => (
        <SkeletonRow key={key} animatedOpacity={animatedOpacity} />
      ))}
    </>
  );
}
