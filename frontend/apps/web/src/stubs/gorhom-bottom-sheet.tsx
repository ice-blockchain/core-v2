import type { ReactNode } from "react";

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
  return <div>{children}</div>;
}

export function BottomSheetView({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

export function BottomSheetScrollView({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

export function BottomSheetBackdrop() {
  return null;
}

export function BottomSheetFooter({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

export function BottomSheetModal({ children }: BottomSheetProps) {
  return <div>{children}</div>;
}

export function BottomSheetModalProvider({ children }: { children?: ReactNode }) {
  return <div style={{ flex: 1 }}>{children}</div>;
}

export default BottomSheet;
