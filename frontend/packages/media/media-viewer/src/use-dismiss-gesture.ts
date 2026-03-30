import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

const DISMISS_THRESHOLD = 150;

interface UseDismissGestureOptions {
  onClose: () => void;
  scale: SharedValue<number>;
}

export function useDismissGesture(options: UseDismissGestureOptions) {
  const { onClose, scale } = options;
  const translateY = useSharedValue(0);

  const dismissGesture = Gesture.Pan()
    .activeOffsetY(10)
    .onUpdate((event) => {
      if (scale.value > 1) return;
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd(() => {
      if (translateY.value > DISMISS_THRESHOLD) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0);
      }
    });

  const dismissStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backgroundOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, DISMISS_THRESHOLD * 2],
      [1, 0.2],
      Extrapolation.CLAMP,
    ),
  }));

  return { dismissGesture, dismissStyle, backgroundOpacity };
}
