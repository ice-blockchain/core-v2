const Reanimated = {
  default: {
    call: () => {},
    createAnimatedComponent: (component: unknown) => component,
  },
  useSharedValue: (value: unknown) => ({ value }),
  useAnimatedStyle: (fn: () => object) => fn(),
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  withTiming: (value: unknown) => value,
  withSpring: (value: unknown) => value,
  withDecay: (value: unknown) => value,
  runOnJS: (fn: unknown) => fn,
  runOnUI: (fn: unknown) => fn,
};

export const useSharedValue = Reanimated.useSharedValue;
export const useAnimatedStyle = Reanimated.useAnimatedStyle;
export const useDerivedValue = Reanimated.useDerivedValue;
export const withTiming = Reanimated.withTiming;
export const withSpring = Reanimated.withSpring;
export const withDecay = Reanimated.withDecay;
export const runOnJS = Reanimated.runOnJS;
export const runOnUI = Reanimated.runOnUI;
export default Reanimated.default;
