import { AvatarPicker as BaseAvatarPicker } from "@ion/ui";

export interface AvatarPickerProps {
  isLoading?: boolean;
  onPress: () => void;
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
