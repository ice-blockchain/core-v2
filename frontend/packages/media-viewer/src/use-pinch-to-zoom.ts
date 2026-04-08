import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;

function clampScale(value: number): number {
  'worklet';
  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
}

interface ZoomState {
  scale: SharedValue<number>;
  savedScale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  savedTranslateX: SharedValue<number>;
  savedTranslateY: SharedValue<number>;
}

function resetTranslation(state: ZoomState) {
  'worklet';
  state.translateX.value = withTiming(0);
  state.translateY.value = withTiming(0);
  state.savedTranslateX.value = 0;
  state.savedTranslateY.value = 0;
}

function buildPinchGesture(state: ZoomState) {
  return Gesture.Pinch()
    .onUpdate((event) => {
      state.scale.value = clampScale(state.savedScale.value * event.scale);
    })
    .onEnd(() => {
      state.savedScale.value = state.scale.value;
      if (state.scale.value <= MIN_SCALE) {
        state.scale.value = withTiming(MIN_SCALE);
        state.savedScale.value = MIN_SCALE;
        resetTranslation(state);
      }
    });
}

function buildDoubleTapGesture(state: ZoomState) {
  return Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const isZoomed = state.scale.value > MIN_SCALE;
      const target = isZoomed ? MIN_SCALE : DOUBLE_TAP_SCALE;
      state.scale.value = withTiming(target);
      state.savedScale.value = target;
      resetTranslation(state);
    });
}

function buildPanGesture(state: ZoomState) {
  return Gesture.Pan()
    .enabled(true)
    .onUpdate((event) => {
      if (state.scale.value <= MIN_SCALE) return;
      state.translateX.value = state.savedTranslateX.value + event.translationX;
      state.translateY.value = state.savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      state.savedTranslateX.value = state.translateX.value;
      state.savedTranslateY.value = state.translateY.value;
    });
}

export function usePinchToZoom() {
  const state: ZoomState = {
    scale: useSharedValue(1),
    savedScale: useSharedValue(1),
    translateX: useSharedValue(0),
    translateY: useSharedValue(0),
    savedTranslateX: useSharedValue(0),
    savedTranslateY: useSharedValue(0),
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: state.scale.value },
      { translateX: state.translateX.value },
      { translateY: state.translateY.value },
    ],
  }), [state.scale, state.translateX, state.translateY]);

  return {
    animatedStyle,
    pinchGesture: buildPinchGesture(state),
    doubleTapGesture: buildDoubleTapGesture(state),
    panGesture: buildPanGesture(state),
    scale: state.scale,
  };
}
