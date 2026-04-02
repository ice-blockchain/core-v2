import type { ViewStyle, TextStyle } from "react-native";
import type { SemanticColors } from "../theme/theme-types";
import type { TextInputState, BorderColors } from "./text-input-types";

export function resolveBorderColors(colors: SemanticColors, state: TextInputState): BorderColors {
  const map: Record<TextInputState, BorderColors> = {
    empty: { border: colors.strokeElements, icon: colors.secondaryText, label: colors.tertiaryText },
    focused: { border: colors.primaryAccent, icon: colors.secondaryText, label: colors.primaryAccent },
    valid: { border: colors.success, icon: colors.secondaryText, label: colors.tertiaryText },
    error: { border: colors.attentionRed, icon: colors.secondaryText, label: colors.attentionRed },
  };
  return map[state];
}

export function buildContainerStyle(borderColor: string, scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor,
    borderRadius: scale(16),
    backgroundColor,
    minHeight: scale(58),
    paddingVertical: scale(11),
    paddingHorizontal: scale(16),
  };
}

export function buildSeparatorStyle(scale: (n: number) => number, separatorColor: string): ViewStyle {
  return {
    width: 1,
    height: scale(26),
    backgroundColor: separatorColor,
    marginHorizontal: scale(16),
  };
}

export function buildInputStyle(scale: (n: number) => number, primaryText: string): TextStyle {
  return {
    flex: 1,
    fontSize: scale(13),
    fontFamily: "NotoSans-SemiBold",
    lineHeight: scale(18),
    color: primaryText,
    paddingVertical: 0,
    paddingHorizontal: 0,
    // @ts-expect-error outlineStyle is a web-only CSS property not in RN TextStyle
    outlineStyle: "none",
  };
}

export function buildFloatingLabelStyle(scale: (n: number) => number, color: string): TextStyle {
  return {
    fontSize: scale(12),
    fontFamily: "NotoSans-Medium",
    color,
  };
}
