import type { ViewStyle } from "react-native";

export function buildOverlayStyle(bgColor: string): ViewStyle {
  return { flex: 1, backgroundColor: bgColor, justifyContent: "flex-end" };
}

export function buildSheetStyle(scale: (n: number) => number, bgColor: string): ViewStyle {
  return {
    backgroundColor: bgColor,
    borderTopLeftRadius: scale(30),
    borderTopRightRadius: scale(30),
    maxHeight: "92%",
    flex: 1,
  };
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

export function computeTitleOpacity(scrollOffset: number): number {
  if (scrollOffset <= 120) return 0;
  if (scrollOffset >= 140) return 1;
  return (scrollOffset - 120) / 20;
}

export function buildWebOverlayStyle(bgColor: string): ViewStyle {
  return {
    position: "fixed" as unknown as ViewStyle["position"],
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: bgColor,
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 1000,
  };
}

export function buildWebSheetStyle(scale: (n: number) => number, bgColor: string): ViewStyle {
  return {
    backgroundColor: bgColor,
    borderTopLeftRadius: scale(30),
    borderTopRightRadius: scale(30),
    width: "100%",
    maxWidth: 500,
    maxHeight: "92%",
    flex: 1,
  };
}
