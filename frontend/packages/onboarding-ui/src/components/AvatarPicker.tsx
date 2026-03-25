import { useMemo } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import type { ImageSourcePropType, StyleProp, ViewStyle } from "react-native";
import { Icon, useTheme } from "@ion/ui";
import { buildAvatarContainerStyle, buildCameraButtonStyle, buildDashedPlaceholderStyle } from "./avatar-picker-styles";

export interface AvatarPickerProps {
  imageSource?: ImageSourcePropType;
  isLoading?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function AvatarPlaceholder({ style }: { style: ViewStyle }) {
  return <View style={style} />;
}

function LoadingOverlay({ style, color }: { style: ViewStyle; color: string }) {
  return (
    <View style={[style, { position: "absolute", justifyContent: "center", alignItems: "center" }]}>
      <ActivityIndicator color={color} />
    </View>
  );
}

export function AvatarPicker({ imageSource, isLoading, onPress, style, testID }: AvatarPickerProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(() => buildAvatarContainerStyle(scale, theme.colors), [scale, theme.colors]);
  const placeholderStyle = useMemo(() => buildDashedPlaceholderStyle(scale, theme.colors), [scale, theme.colors]);
  const cameraStyle = useMemo(() => buildCameraButtonStyle(scale, theme.colors), [scale, theme.colors]);

  return (
    <Pressable onPress={onPress} style={[containerStyle, style]} testID={testID} accessibilityRole="button">
      {imageSource ? null : <AvatarPlaceholder style={placeholderStyle} />}
      {isLoading ? <LoadingOverlay style={containerStyle} color={theme.colors.primaryAccent} /> : null}
      <View style={cameraStyle}>
        <Icon name="camera" size={scale(24)} color={theme.colors.onPrimaryAccent} />
      </View>
    </Pressable>
  );
}
