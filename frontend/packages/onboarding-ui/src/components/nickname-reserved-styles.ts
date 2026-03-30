import type { ViewStyle } from "react-native";

export function buildOverlayStyle(bgColor: string): ViewStyle {
  return { flex: 1, backgroundColor: bgColor, justifyContent: "flex-end" };
}

export function buildHandleStyle(scale: (n: number) => number, handleColor: string): ViewStyle {
  return {
    width: scale(50),
    height: scale(3),
    borderRadius: scale(5),
    backgroundColor: handleColor,
    alignSelf: "center",
    marginBottom: scale(8),
  };
}

export function buildSheetStyle(scale: (n: number) => number, bgColor: string): ViewStyle {
  return {
    backgroundColor: bgColor,
    borderTopLeftRadius: scale(30),
    borderTopRightRadius: scale(30),
  };
}

export function buildHeaderStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingTop: scale(20),
    paddingBottom: scale(16),
  };
}

export function buildContentStyle(scale: (n: number) => number): ViewStyle {
  return { alignItems: "center", gap: scale(10), paddingTop: scale(16) };
}

export function buildTextGroupStyle(scale: (n: number) => number, bottomInset: number): ViewStyle {
  return { alignItems: "stretch", gap: scale(8), paddingHorizontal: scale(16), paddingBottom: scale(16) + bottomInset };
}
