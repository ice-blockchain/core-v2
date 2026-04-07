import type { TooltipProps } from './tooltip-types';

export function Tooltip({ children, isVisible }: TooltipProps) {
  if (!isVisible) return null;
  return <>{children}</>;
}
