import { Dimensions } from "react-native";

const BASE_DESIGN_WIDTH = 375;

const screenWidth = Dimensions.get("screen").width;
const ratio = screenWidth / BASE_DESIGN_WIDTH;

export function rem(size: number): number {
  return Math.round(size * ratio * 2) / 2;
}
