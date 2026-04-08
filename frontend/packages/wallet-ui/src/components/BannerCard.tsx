import { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Text, useTheme } from "@ion/ui";
import {
  buildCardContainerStyle,
  buildTextBlockStyle,
  buildCardImageStyle,
} from "./banner-carousel-styles";

interface BannerCardProps {
  title: string;
  description: string;
  image: ImageSourcePropType;
}

export function BannerCard({ title, description, image }: BannerCardProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const scaleRadius = theme.scale.scaleRadius;

  const containerStyle = useMemo(
    () => buildCardContainerStyle(scale, scaleRadius, theme.colors),
    [scale, scaleRadius, theme.colors],
  );
  const textBlockStyle = useMemo(() => buildTextBlockStyle(scale), [scale]);
  const imageStyle = useMemo(() => buildCardImageStyle(scale), [scale]);

  return (
    <View style={containerStyle}>
      <View style={[styles.textBlock, textBlockStyle]}>
        <Text variant="title" color={theme.colors.primaryText}>{title}</Text>
        <Text variant="body2" color={theme.colors.primaryText}>{description}</Text>
      </View>
      <Image source={image} style={[styles.image, imageStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  textBlock: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  image: {
    position: "absolute",
  },
});
