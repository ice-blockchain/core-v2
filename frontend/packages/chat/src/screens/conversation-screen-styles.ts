import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

type ScaleFn = (n: number) => number;

export function buildConversationScreenStyle(backgroundColor: string): ViewStyle {
  return { flex: 1, backgroundColor };
}

export function buildConversationContentStyle(backgroundColor: string): ViewStyle {
  return { flex: 1, backgroundColor };
}

export function buildHeaderContainerStyle(scale: ScaleFn, backgroundColor: string): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    height: scale(48),
    backgroundColor,
  };
}

export function buildHeaderLeftStyle(scale: ScaleFn): ViewStyle {
  return { flexDirection: "row", alignItems: "center", gap: scale(12) };
}

export function buildHeaderUserInfoStyle(scale: ScaleFn): ViewStyle {
  return { flexDirection: "row", alignItems: "center", gap: scale(10) };
}

export function buildHeaderAvatarStyle(scale: ScaleFn): ViewStyle {
  return {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    alignItems: "center",
    justifyContent: "center",
  };
}

export function buildHeaderNameRowStyle(): ViewStyle {
  return { flexDirection: "row", alignItems: "center", gap: 3 };
}

export function buildHeaderNameContainerStyle(scale: ScaleFn): ViewStyle {
  return { gap: scale(1), width: scale(135) };
}

export function buildDatePillStyle(scale: ScaleFn, backgroundColor: string): ViewStyle {
  return {
    alignSelf: "center",
    paddingHorizontal: scale(6),
    paddingVertical: scale(1),
    borderRadius: scale(16),
    backgroundColor,
    marginTop: scale(12),
  };
}

export function buildEmptyStateContainerStyle(scale: ScaleFn): ViewStyle {
  return {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: scale(9),
  };
}

export function buildEmptyStateInnerStyle(scale: ScaleFn): ViewStyle {
  return {
    alignItems: "center",
    gap: scale(8),
    maxWidth: scale(246),
  };
}

export function buildEncryptedImageStyle(scale: ScaleFn): ImageStyle {
  const size = scale(48);
  return { width: size, height: size };
}

export function buildCenteredTextStyle(): TextStyle {
  return { textAlign: "center" };
}

export function buildChatBarContainerStyle(scale: ScaleFn, backgroundColor: string): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    height: scale(48),
    backgroundColor,
  };
}

export function buildChatBarIconButtonStyle(scale: ScaleFn): ViewStyle {
  return { padding: scale(4), marginHorizontal: scale(4) };
}

export function buildChatBarInputContainerStyle(scale: ScaleFn, backgroundColor: string): ViewStyle {
  return {
    flex: 1,
    height: scale(32),
    borderRadius: scale(18),
    backgroundColor,
    justifyContent: "center",
    paddingHorizontal: scale(12),
  };
}

export function buildChatBarInputStyle(): TextStyle {
  return { padding: 0 };
}
