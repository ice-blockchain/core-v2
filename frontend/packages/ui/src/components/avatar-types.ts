import type { ReactNode } from "react";

export interface AvatarProps {
  size: number;
  imageUrl?: string;
  imageElement?: ReactNode;
  fallback?: ReactNode;
  badge?: ReactNode;
  borderRadius?: number;
  contentFit?: "cover" | "contain";
  testID?: string;
}
