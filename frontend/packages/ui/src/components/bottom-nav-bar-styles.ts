import type { ViewStyle } from "react-native";

// The 50px row extends 11px into the home indicator safe area by design (Figma: mb-[-11px]).
// This keeps the bar compact while the 50x50 center button stays vertically centered.
const ROW_SAFE_AREA_OVERLAP = 11;

interface BarContainerOptions {
  scale: (n: number) => number;
  bgColor: string;
  bottomInset: number;
  shadowColor: string;
}

export function buildBarContainerStyle(options: BarContainerOptions): ViewStyle {
  const { scale, bgColor, bottomInset, shadowColor } = options;
  return {
    backgroundColor: bgColor,
    paddingTop: scale(9),
    paddingBottom: Math.max(0, bottomInset - scale(ROW_SAFE_AREA_OVERLAP)),
    shadowColor,
    shadowOffset: { width: -2, height: -2 },
    shadowOpacity: 0.055,
    shadowRadius: 16,
    elevation: 4,
  };
}

export function buildBarRowStyle(scale: (n: number) => number, bgColor: string): ViewStyle {
  return {
    flexDirection: "row",
    height: scale(50),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: bgColor,
  };
}

export function buildTabSlotStyle(): ViewStyle {
  return {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  } as ViewStyle;
}

export function buildCenterSlotStyle(): ViewStyle {
  return {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  } as ViewStyle;
}


export function buildProfileContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(6),
    justifyContent: "center",
    alignItems: "center",
  };
}

export function buildProfileRingStyle(scale: (n: number) => number, ringColor: string): ViewStyle {
  return {
    position: "absolute",
    width: scale(20),
    height: scale(20),
    borderRadius: scale(6),
    borderWidth: scale(1.2),
    borderColor: ringColor,
  };
}

export function buildBadgeContainerStyle(scale: (n: number) => number, bgColor: string): ViewStyle {
  return {
    position: "absolute",
    top: scale(-1.5),
    right: scale(-1),
    height: scale(9),
    minWidth: scale(9),
    borderRadius: scale(8),
    backgroundColor: bgColor,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(2),
  };
}

export function buildActionRowStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(40),
    gap: scale(10),
  };
}

export function buildActionIconBoxStyle(scale: (n: number) => number, bgColor: string): ViewStyle {
  return {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
    backgroundColor: bgColor,
    alignItems: "center",
    justifyContent: "center",
  };
}
