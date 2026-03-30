import LottieView from "lottie-react-native";
import whiteLoaderData from "../assets/animations/white-loader.json";
import darkLoaderData from "../assets/animations/dark-loader.json";
import type { IONLoaderProps, IONLoaderVariant } from "./IONLoaderTypes";
import { buildIONLoaderStyle } from "./IONLoaderStyles";

function resolveAnimationData(variant: IONLoaderVariant) {
  if (variant === "dark") {
    return whiteLoaderData;
  }
  return darkLoaderData;
}

export function IONLoader({ variant, size = 20 }: IONLoaderProps) {
  return (
    <LottieView
      source={resolveAnimationData(variant)}
      autoPlay
      loop
      style={buildIONLoaderStyle(size)}
    />
  );
}
