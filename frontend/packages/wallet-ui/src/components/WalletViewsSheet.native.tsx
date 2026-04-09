import { BottomSheetView } from "@gorhom/bottom-sheet";
import { FullscreenBottomSheet, useTheme } from "@ion/ui";
import { WalletViewsSheetContent } from "./wallet-views-sheet-content";

interface WalletViewsSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export function WalletViewsSheet({ isVisible, onClose }: WalletViewsSheetProps) {
  const theme = useTheme();

  return (
    <FullscreenBottomSheet isVisible={isVisible} onClose={onClose} enableDynamicSizing>
      <BottomSheetView style={{ backgroundColor: theme.colors.secondaryBackground }}>
        <WalletViewsSheetContent onClose={onClose} />
      </BottomSheetView>
    </FullscreenBottomSheet>
  );
}
