import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

export interface SkeletonPulseProps {
  readonly children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

const PULSE_DURATION = 1000;
const OPACITY_MIN = 0.75;
const OPACITY_MAX = 1;

export function SkeletonPulse({ children, style }: SkeletonPulseProps) {
  const opacity = useRef(new Animated.Value(OPACITY_MAX)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: OPACITY_MIN,
          duration: PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: OPACITY_MAX,
          duration: PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
}
