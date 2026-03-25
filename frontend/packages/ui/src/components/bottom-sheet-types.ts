import type { ReactNode } from "react";

export interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  onBack?: () => void;
  bottomButton?: ReactNode;
  children: ReactNode;
  testID?: string;
}
