import type { ViewStyle } from "react-native";
import type { SemanticColors } from "@ion/ui";

export function buildContentContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    alignItems: "center",
    paddingBottom: scale(40),
  };
}

export function buildAuthHeaderStyle(scale: (n: number) => number): ViewStyle {
  return {
    alignItems: "center",
    paddingHorizontal: scale(28),
    gap: scale(4),
  };
}

export function buildLogoContainerStyle(scale: (n: number) => number, colors: SemanticColors): ViewStyle {
  return {
    width: scale(65),
    height: scale(65),
    borderRadius: scale(33),
    backgroundColor: colors.primaryAccent,
    justifyContent: "center",
    alignItems: "center",
  };
}

export function buildFieldsContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    width: "100%",
    paddingHorizontal: scale(44),
    gap: scale(16),
  };
}

export function buildAvatarSectionStyle(scale: (n: number) => number): ViewStyle {
  return {
    paddingTop: scale(28),
    paddingBottom: scale(32),
    alignItems: "center",
  };
}

export function buildSaveButtonContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    paddingHorizontal: scale(16),
    paddingTop: scale(26),
    width: "100%",
  };
}
