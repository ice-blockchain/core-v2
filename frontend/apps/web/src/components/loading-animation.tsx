"use client";

import { useEffect, useRef } from "react";
import Lottie from "lottie-react";
import type { LottieRef } from "lottie-react";
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

export function LoadingAnimation({ variant, size = 20, progress }: LoadingAnimationProps) {
  const lottieRef: LottieRef = useRef(null);
  const isIndeterminate = progress === undefined;

  useEffect(() => {
    if (!isIndeterminate && lottieRef.current) {
      const frame = mapProgressToFrame(progress);
      lottieRef.current.goToAndStop(frame, true);
    }
  }, [progress, isIndeterminate]);

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={resolveAnimationData(variant)}
      loop={isIndeterminate}
      autoplay={isIndeterminate}
      style={{ width: size, height: size }}
    />
  );
}
