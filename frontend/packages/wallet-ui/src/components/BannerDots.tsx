import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@ion/ui";
import {
  buildActiveDotStyle,
  buildInactiveDotStyle,
  buildDotsContainerStyle,
  buildDotsInsideStyle,
} from "./banner-carousel-styles";

interface BannerDotsProps {
  count: number;
  activeIndex: number;
  inside?: boolean;
}

export function BannerDots({ count, activeIndex, inside }: BannerDotsProps) {
  const { colors, scale: { scaleSize: scale, scaleRadius } } = useTheme();

  const containerStyle = useMemo(
    () => (inside ? buildDotsInsideStyle(scale) : buildDotsContainerStyle(scale)),
    [scale, inside],
  );
  const activeDot = useMemo(() => buildActiveDotStyle(scale, scaleRadius, colors), [scale, scaleRadius, colors]);
  const inactiveDot = useMemo(() => buildInactiveDotStyle(scale, scaleRadius, colors), [scale, scaleRadius, colors]);

  const dots = Array.from({ length: count }, (_, i) => i);

  return (
    <View style={[styles.container, containerStyle]}>
      {dots.map((i) => (
        <View key={i} style={i === activeIndex ? activeDot : inactiveDot} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
