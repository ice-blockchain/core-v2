import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import type { ScaleFunctions } from "../scaling/scaling-types";

const ANIMATION_DURATION = 500;
const BAR_HEIGHT = 24;

interface NotificationBarAnimatedContainerProps {
  isVisible: boolean;
  scale: ScaleFunctions;
  onHideComplete: () => void;
  children: React.ReactNode;
}

function useBarHeightAnimation(options: {
  isVisible: boolean;
  onHideComplete: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const onHideCompleteRef = useRef(options.onHideComplete);
  onHideCompleteRef.current = options.onHideComplete;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: options.isVisible ? 1 : 0,
      duration: ANIMATION_DURATION,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !options.isVisible) {
        onHideCompleteRef.current();
      }
    });
  }, [options.isVisible, progress]);

  return progress;
}

export function NotificationBarAnimatedContainer(props: NotificationBarAnimatedContainerProps) {
  const { isVisible, scale, onHideComplete, children } = props;
  const progress = useBarHeightAnimation({ isVisible, onHideComplete });
  const scaledHeight = scale.scaleSize(BAR_HEIGHT);

  const animatedStyle = {
    height: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, scaledHeight],
    }),
    opacity: progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 1],
    }),
    overflow: "hidden" as const,
  };

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
