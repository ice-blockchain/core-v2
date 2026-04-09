import { View } from "react-native";
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
      <View style={{ backgroundColor: theme.colors.secondaryBackground }}>
        <WalletViewsSheetContent onClose={onClose} />
      </View>
    </FullscreenBottomSheet>
  );
}
