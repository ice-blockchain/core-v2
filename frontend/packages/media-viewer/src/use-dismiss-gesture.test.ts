import { renderHook } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useDismissGesture } from './use-dismiss-gesture';

jest.mock('react-native-gesture-handler', () => {
  const gestureBuilder = () => ({
    onUpdate: () => gestureBuilder(),
    onEnd: () => gestureBuilder(),
    activeOffsetY: () => gestureBuilder(),
  });
  return {
    Gesture: { Pan: gestureBuilder },
  };
});

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withSpring: (value: number) => value,
  runOnJS: (fn: () => void) => fn,
  interpolate: (value: number, input: number[], output: number[]) => {
    const ratio = (value - input[0]!) / (input[1]! - input[0]!);
    return output[0]! + ratio * (output[1]! - output[0]!);
  },
  Extrapolation: { CLAMP: 'clamp' },
}));

describe('useDismissGesture', () => {
  const defaultOptions = {
    onClose: jest.fn(),
    scale: { value: 1 } as SharedValue<number>,
  };

  it('returns dismiss style with zero translation initially', () => {
    const { result } = renderHook(() => useDismissGesture(defaultOptions));
    expect(result.current.dismissStyle).toEqual({
      transform: [{ translateY: 0 }],
    });
  });

  it('returns background opacity of 1 initially', () => {
    const { result } = renderHook(() => useDismissGesture(defaultOptions));
    expect((result.current.backgroundOpacity as unknown as { opacity: number }).opacity).toBe(1);
  });

  it('returns a dismiss gesture object', () => {
    const { result } = renderHook(() => useDismissGesture(defaultOptions));
    expect(result.current.dismissGesture).toBeDefined();
  });
});
