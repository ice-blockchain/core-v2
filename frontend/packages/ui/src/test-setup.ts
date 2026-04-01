import { vi } from "vitest";

// Mock react-native modules for vitest/jsdom environment
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Modal: "Modal",
  ActivityIndicator: "ActivityIndicator",
  Animated: {
    View: "Animated.View",
    Value: vi.fn(() => ({ interpolate: vi.fn() })),
    timing: vi.fn(() => ({ start: vi.fn() })),
  },
  Platform: { OS: "web", select: vi.fn((obj: Record<string, unknown>) => obj.web ?? obj.default) },
  useWindowDimensions: () => ({ width: 375, height: 812 }),
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
}));

vi.mock("react-native-svg", () => ({
  default: "Svg",
  Svg: "Svg",
  Path: "Path",
  Rect: "Rect",
  Circle: "Circle",
  G: "G",
}));

vi.mock("react-native-linear-gradient", () => ({
  default: "LinearGradient",
  LinearGradient: "LinearGradient",
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));
