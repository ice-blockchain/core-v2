import type { StyleProp, ViewStyle } from "react-native";
import { AvatarPicker as BaseAvatarPicker } from "@ion/ui";

export interface AvatarPickerProps {
  isLoading?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function AvatarPicker({ isLoading, onPress, testID }: AvatarPickerProps) {
  return (
    <BaseAvatarPicker
      onPickRequested={onPress}
      {...(isLoading !== undefined ? { isProcessing: isLoading } : {})}
      {...(testID !== undefined ? { testID } : {})}
    />
  );
}
