import type { ViewStyle, TextStyle } from "react-native";
import type { Theme } from "../theme/theme-types";

const BAR_HEIGHT = 24;
const ICON_TEXT_GAP = 8;
const HORIZONTAL_PADDING = 16;

export function buildNotificationBarContainerStyle(options: {
  backgroundColor: string;
  theme: Theme;
}): ViewStyle {
  const { backgroundColor, theme } = options;
  return {
    width: "100%",
    height: theme.scale.scaleSize(BAR_HEIGHT),
    backgroundColor,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  };
}

export function buildNotificationBarContentStyle(options: {
  theme: Theme;
  hasSuffixAction: boolean;
}): ViewStyle {
  const { theme, hasSuffixAction } = options;
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: hasSuffixAction ? "space-between" : "center",
    gap: theme.scale.scaleSize(ICON_TEXT_GAP),
    width: "100%",
    paddingHorizontal: hasSuffixAction ? theme.scale.scaleSize(HORIZONTAL_PADDING) : 0,
  };
}

export function buildNotificationBarTextStyle(options: {
  theme: Theme;
}): TextStyle {
  const { theme } = options;
  const variant = theme.typography.body2;
  return {
    fontFamily: variant.fontFamily,
    fontSize: variant.fontSize,
    fontWeight: variant.fontWeight,
    lineHeight: variant.lineHeight,
    letterSpacing: variant.letterSpacing,
    color: theme.colors.onPrimaryAccent,
  };
}
