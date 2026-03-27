import { useMemo } from "react";
import type { ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

export function useSheetStyles() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const backgroundStyle = useMemo<ViewStyle>(
    () => ({ backgroundColor: theme.colors.secondaryBackground }),
    [theme.colors.secondaryBackground],
  );

  const handleIndicatorStyle = useMemo<ViewStyle>(
    () => ({ backgroundColor: theme.colors.sheetLine }),
    [theme.colors.sheetLine],
  );

  const safeBottomStyle = useMemo<ViewStyle>(
    () => ({ paddingBottom: insets.bottom }),
    [insets.bottom],
  );

  return { backgroundStyle, handleIndicatorStyle, safeBottomStyle, theme };
}
