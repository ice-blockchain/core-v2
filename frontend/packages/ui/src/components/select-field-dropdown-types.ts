import type { ReactNode, RefObject } from "react";
import type { View } from "react-native";

export interface SelectOption {
  label: string;
  icon?: ReactNode;
}

export interface SelectFieldDropdownProps {
  options: SelectOption[];
  disabledOptions?: string[] | undefined;
  onSelect: (label: string) => void;
  isVisible: boolean;
  onClose: () => void;
  anchorRef: RefObject<View | null>;
}

export const SELECT_FIELD_Z_INDEX = 20;
export const DROPDOWN_GAP = 4;
