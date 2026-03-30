import LottieView from "lottie-react-native";
import whiteLoaderData from "@ion/ui/animations/white-loader.json";
import darkLoaderData from "@ion/ui/animations/dark-loader.json";

type Variant = "onDarkBackground" | "onLightBackground" | "dark" | "light";

interface LoadingAnimationProps {
  variant: Variant;
  size?: number;
  progress?: number;
}

const TOTAL_FRAMES = 41;

function resolveAnimationData(variant: Variant) {
  if (variant === "onDarkBackground" || variant === "light") {
    return whiteLoaderData;
  }
  return darkLoaderData;
}

function mapProgressToFrame(progress: number): number {
  const controllerProgress = (progress + 1) / 2;
  return Math.round(controllerProgress * (TOTAL_FRAMES - 1));
}

export function LoadingAnimation({
  variant,
  size = 20,
  progress,
}: LoadingAnimationProps) {
  const isIndeterminate = progress === undefined;
  const normalizedProgress = isIndeterminate
    ? undefined
    : mapProgressToFrame(progress) / TOTAL_FRAMES;

  return (
    <LottieView
      source={resolveAnimationData(variant)}
      autoPlay={isIndeterminate}
      loop={isIndeterminate}
      progress={normalizedProgress}
      style={{ width: size, height: size }}
    />
  );
}
