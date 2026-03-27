import type { ReactNode } from "react";
import { View } from "react-native";

interface BottomSheetProps {
  children?: ReactNode;
  snapPoints?: Array<string | number>;
  index?: number;
  enableDynamicSizing?: boolean;
  enablePanDownToClose?: boolean;
  onChange?: (index: number) => void;
  onClose?: () => void;
  backdropComponent?: unknown;
  footerComponent?: unknown;
  backgroundStyle?: object;
  handleIndicatorStyle?: object;
  [key: string]: unknown;
}

export function BottomSheet({ children }: BottomSheetProps) {
  return <View>{children}</View>;
}

export function BottomSheetView({ children }: { children?: ReactNode }) {
  return <View>{children}</View>;
}

export function BottomSheetScrollView({ children }: { children?: ReactNode }) {
  return <View>{children}</View>;
}

export function BottomSheetBackdrop() {
  return null;
}

export function BottomSheetFooter({ children }: { children?: ReactNode }) {
  return <View>{children}</View>;
}

export function BottomSheetModal({ children }: BottomSheetProps) {
  return <View>{children}</View>;
}

export function BottomSheetModalProvider({ children }: { children?: ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

export default BottomSheet;
