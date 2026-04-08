import type { ViewStyle } from "react-native";

type ScaleFn = (n: number) => number;

export function buildWrapperStyle(scale: ScaleFn): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  };
}

interface FieldStyleInput {
  scale: ScaleFn;
  backgroundColor: string;
  borderColor: string;
  isFocused: boolean;
}

export function buildFieldStyle(input: FieldStyleInput): ViewStyle {
  return {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: input.scale(40),
    borderRadius: input.scale(16),
    paddingHorizontal: input.scale(12),
    backgroundColor: input.backgroundColor,
    borderWidth: input.isFocused ? 1 : 0,
    borderColor: input.borderColor,
  };
}

export function buildInputSectionStyle(scale: ScaleFn): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    flex: 1,
  };
}
