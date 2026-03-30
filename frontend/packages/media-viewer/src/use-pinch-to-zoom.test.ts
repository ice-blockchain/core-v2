import { renderHook } from '@testing-library/react-native';
import { usePinchToZoom } from './use-pinch-to-zoom';

jest.mock('react-native-gesture-handler', () => {
  const gestureBuilder = () => ({
    onUpdate: () => gestureBuilder(),
    onEnd: () => gestureBuilder(),
    enabled: () => gestureBuilder(),
    numberOfTaps: () => gestureBuilder(),
  });
  return {
    Gesture: {
      Pinch: gestureBuilder,
      Tap: gestureBuilder,
      Pan: gestureBuilder,
    },
  };
});

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withTiming: (value: number) => value,
}));

describe('usePinchToZoom', () => {
  it('returns animated style with initial transform values', () => {
    const { result } = renderHook(() => usePinchToZoom());
    expect(result.current.animatedStyle).toEqual({
      transform: [{ scale: 1 }, { translateX: 0 }, { translateY: 0 }],
    });
  });

  it('returns gesture objects', () => {
    const { result } = renderHook(() => usePinchToZoom());
    expect(result.current.pinchGesture).toBeDefined();
    expect(result.current.doubleTapGesture).toBeDefined();
    expect(result.current.panGesture).toBeDefined();
  });

  it('returns a scale shared value starting at 1', () => {
    const { result } = renderHook(() => usePinchToZoom());
    expect(result.current.scale.value).toBe(1);
  });
});
