import { useMemo } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../icons/Icon";
import { Avatar } from "./Avatar";
import type { AvatarPickerProps } from "./avatar-picker-types";
import { buildPickerContainerStyle, buildPlaceholderStyle, buildCameraButtonStyle } from "./avatar-picker-styles";

const DEFAULT_SIZE = 100;
const DEFAULT_BORDER_RADIUS = 20;
const DEFAULT_CAMERA_SIZE = 36;

function resolveImageUrl(props: AvatarPickerProps): string | undefined {
  return props.localImageUri ?? props.currentImageUrl;
}

function CameraButton(props: { style: ReturnType<typeof buildCameraButtonStyle>; isProcessing: boolean; onPress: () => void; iconSize: number; iconColor: string }) {
  return (
    <Pressable style={props.style} onPress={props.onPress} disabled={props.isProcessing} accessibilityRole="button" accessibilityLabel="Change avatar" accessibilityState={{ busy: props.isProcessing }}>
      {props.isProcessing ? (
        <ActivityIndicator color={props.iconColor} size={props.iconSize} />
      ) : (
        <Icon name="profile-camera" size={props.iconSize} color={props.iconColor} />
      )}
    </Pressable>
  );
}

export function AvatarPicker(props: AvatarPickerProps) {
  const { onPickRequested, currentImageElement, isProcessing = false, testID } = props;
  const size = props.size ?? DEFAULT_SIZE;
  const borderRadius = props.borderRadius ?? DEFAULT_BORDER_RADIUS;
  const cameraButtonSize = props.cameraButtonSize ?? DEFAULT_CAMERA_SIZE;

  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const styleOptions = useMemo(() => ({ size, borderRadius, scale, colors: theme.colors }), [size, borderRadius, scale, theme.colors]);

  const containerStyle = useMemo(() => buildPickerContainerStyle(styleOptions), [styleOptions]);
  const placeholderStyle = useMemo(() => buildPlaceholderStyle(styleOptions), [styleOptions]);
  const cameraStyle = useMemo(() => buildCameraButtonStyle({ ...styleOptions, buttonSize: cameraButtonSize }), [styleOptions, cameraButtonSize]);

  const imageUrl = resolveImageUrl(props);
  const hasImage = Boolean(imageUrl) || Boolean(currentImageElement);

  return (
    <View style={containerStyle} testID={testID}>
      {hasImage ? (
        <Avatar size={size} {...(imageUrl ? { imageUrl } : {})} imageElement={currentImageElement} borderRadius={borderRadius} />
      ) : (
        <View style={placeholderStyle} />
      )}
      <CameraButton
        style={cameraStyle}
        isProcessing={isProcessing}
        onPress={onPickRequested}
        iconSize={scale(cameraButtonSize * 0.67)}
        iconColor={theme.colors.onPrimaryAccent}
      />
    </View>
  );
}
