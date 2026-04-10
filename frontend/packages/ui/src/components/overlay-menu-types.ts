import type { ReactNode, RefObject } from "react";
import type { View } from "react-native";

export interface OverlayMenuProps {
  isVisible: boolean;
  onClose: () => void;
  anchorRef: RefObject<View | null>;
  children: ReactNode;
  width?: number;
  testID?: string;
}

export interface AnchorMeasurement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MENU_ANIMATION_DURATION = 200;
export const MENU_GAP = 4;
export const MENU_WIDTH = 200;
