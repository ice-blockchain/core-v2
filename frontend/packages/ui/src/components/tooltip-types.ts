import type { ReactNode, RefObject } from 'react';
import type { View } from 'react-native';

export interface TooltipProps {
  targetRef: RefObject<View | null>;
  isVisible: boolean;
  onDismiss: () => void;
  position?: 'top' | 'bottom';
  pointerAlign?: 'left' | 'center' | 'right';
  autoDismissMs?: number;
  highlightContent?: ReactNode;
  children: ReactNode;
}

export interface TargetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}
