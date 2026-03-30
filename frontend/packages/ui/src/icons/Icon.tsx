import type { IconName } from "./icon-types";
import { iconRegistry } from "./icon-registry";

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 24, color }: IconProps) {
  const IconComponent = iconRegistry[name];
  if (!IconComponent) return null;
  return <IconComponent size={size} color={color ?? ""} />;
}

export type { IconName };
