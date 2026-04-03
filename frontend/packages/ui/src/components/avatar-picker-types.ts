import type { ReactNode } from "react";

export interface AvatarPickerProps {
  onPickRequested: () => void;
  currentImageUrl?: string;
  currentImageElement?: ReactNode;
  localImageUri?: string;
  isProcessing?: boolean;
  size?: number;
  borderRadius?: number;
  cameraButtonSize?: number;
  testID?: string;
}
