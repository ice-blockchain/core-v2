import type { ReactNode } from "react";

interface BottomSheetBaseProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  onBack?: () => void;
  children: ReactNode;
  overlay?: ReactNode;
  inline?: boolean;
  testID?: string;
}

type BottomSheetFooterProps =
  | { bottomButton?: ReactNode; floatingFooter?: never }
  | { floatingFooter?: ReactNode; bottomButton?: never };

export type BottomSheetProps = BottomSheetBaseProps & BottomSheetFooterProps;
