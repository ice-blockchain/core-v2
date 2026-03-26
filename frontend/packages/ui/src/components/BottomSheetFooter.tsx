import type { ReactNode } from "react";
import { useMemo } from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
interface BottomSheetFooterProps {
  children: ReactNode;
}

function buildFooterStyle(scale: (n: number) => number, bottomInset: number, bgColor: string): ViewStyle {
  return {
    paddingHorizontal: scale(44),
    paddingTop: scale(12),
    paddingBottom: scale(16) + bottomInset,
    backgroundColor: bgColor,
  };
}

export function BottomSheetFooter({ children }: BottomSheetFooterProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();

  const footerStyle = useMemo(
    () => buildFooterStyle(scale, insets.bottom, theme.colors.secondaryBackground),
    [scale, insets.bottom, theme.colors.secondaryBackground],
  );

  return (
    <View style={footerStyle}>{children}</View>
  );
}
