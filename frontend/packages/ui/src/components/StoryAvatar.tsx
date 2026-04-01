import { useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { gradients } from "../tokens/gradients";
import { Avatar } from "./Avatar";
import { StoryAvatarGradientRing } from "./StoryAvatarGradientRing";
import { buildRingContainerStyle, buildSolidRingStyle, buildBadgeOverlayStyle } from "./story-avatar-styles";
import type { StoryAvatarProps, StoryAvatarStyleOptions } from "./story-avatar-types";
import { RING_WIDTH, GAP_RATIO } from "./story-avatar-types";

function useStoryAvatarStyles(size: number, resolvedRadius: number, gap: number) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const styleOptions: StoryAvatarStyleOptions = useMemo(
    () => ({ size, borderRadius: resolvedRadius, ringWidth: RING_WIDTH, gap, scale, colors: theme.colors }),
    [size, resolvedRadius, gap, scale, theme.colors],
  );

  return {
    scale,
    containerStyle: useMemo(() => buildRingContainerStyle(styleOptions), [styleOptions]),
    solidRingStyle: useMemo(() => buildSolidRingStyle(styleOptions), [styleOptions]),
    badgeStyle: useMemo(() => buildBadgeOverlayStyle(styleOptions), [styleOptions]),
  };
}

export function StoryAvatar({ size, imageUrl, imageElement, gradientName = "orangeRed", isViewed = false, badge, borderRadius, testID }: StoryAvatarProps) {
  const resolvedRadius = borderRadius ?? size * 0.3;
  const gap = size * GAP_RATIO;
  const { scale, containerStyle, solidRingStyle, badgeStyle } = useStoryAvatarStyles(size, resolvedRadius, gap);

  return (
    <View style={containerStyle} testID={testID}>
      {isViewed ? (
        <View style={solidRingStyle} />
      ) : (
        <StoryAvatarGradientRing size={size} borderRadius={resolvedRadius} ringWidth={RING_WIDTH} stops={gradients[gradientName] ?? []} scale={scale} />
      )}
      <Avatar size={size - 2 * gap} {...(imageUrl ? { imageUrl } : {})} imageElement={imageElement} borderRadius={resolvedRadius - gap} />
      {badge ? <View style={badgeStyle} pointerEvents="box-none">{badge}</View> : null}
    </View>
  );
}
