import type { ReactNode } from "react";

export interface FullscreenBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  snapPoints?: Array<string | number>;
  enableDynamicSizing?: boolean;
  enablePanDownToClose?: boolean;
  children: ReactNode;
}

export interface FullscreenBottomSheetRef {
  present: () => void;
  dismiss: () => void;
  snapToIndex: (index: number) => void;
}
