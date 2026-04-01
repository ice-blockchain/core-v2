import { useMemo, useState } from "react";
import { Image, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../icons/Icon";
import type { AvatarProps } from "./avatar-types";
import { buildContainerStyle, buildImageStyle, buildFallbackStyle, buildBadgeOverlayStyle } from "./avatar-styles";

function DefaultFallback({ size, scale, color }: { size: number; scale: (n: number) => number; color: string }) {
  return <Icon name="profile-noimage" size={scale(size * 0.75)} color={color} />;
}

export function Avatar({ size, imageUrl, imageElement, fallback, badge, borderRadius, contentFit = "cover", testID }: AvatarProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const resolvedRadius = borderRadius ?? size * 0.3;
  const [hasImageError, setHasImageError] = useState(false);

  const styleOptions = useMemo(
    () => ({ size, borderRadius: resolvedRadius, scale, colors: theme.colors }),
    [size, resolvedRadius, scale, theme.colors],
  );

  const containerStyle = useMemo(() => buildContainerStyle(styleOptions), [styleOptions]);
  const imgStyle = useMemo(() => buildImageStyle({ ...styleOptions, contentFit }), [styleOptions, contentFit]);
  const fallbackStyle = useMemo(() => buildFallbackStyle(styleOptions), [styleOptions]);
  const badgeStyle = useMemo(() => buildBadgeOverlayStyle(styleOptions), [styleOptions]);

  const hasImage = imageUrl && !hasImageError;

  return (
    <View style={containerStyle} testID={testID}>
      {hasImage ? (
        <Image source={{ uri: imageUrl }} style={imgStyle} resizeMode={contentFit} onError={() => setHasImageError(true)} />
      ) : imageElement ? (
        <View style={{ ...imgStyle, overflow: "hidden" }}>{imageElement}</View>
      ) : (
        <View style={fallbackStyle}>
          {fallback ?? <DefaultFallback size={size} scale={scale} color={theme.colors.onPrimaryAccent} />}
        </View>
      )}
      {badge ? <View style={badgeStyle} pointerEvents="box-none">{badge}</View> : null}
    </View>
  );
}
