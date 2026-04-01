import type { ReactNode } from "react";
import type { SemanticColors } from "../theme/theme-types";
import type { gradients } from "../tokens/gradients";

export const RING_WIDTH = 1.5;
export const GAP_RATIO = 0.0462;

export interface StoryAvatarProps {
  size: number;
  imageUrl?: string;
  imageElement?: ReactNode;
  gradientName?: keyof typeof gradients;
  isViewed?: boolean;
  badge?: ReactNode;
  borderRadius?: number;
  testID?: string;
}

export interface StoryAvatarStyleOptions {
  size: number;
  borderRadius: number;
  ringWidth: number;
  gap: number;
  scale: (n: number) => number;
  colors: SemanticColors;
}
