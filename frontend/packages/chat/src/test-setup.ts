/* eslint-disable max-lines-per-function */
import { vi } from "vitest";

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  FlatList: "FlatList",
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
  default: "Svg", Svg: "Svg", Path: "Path", Rect: "Rect", Circle: "Circle", G: "G",
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockTheme = {
  colors: {
    primaryAccent: "#0166FF", onPrimaryAccent: "#FFFFFF", primaryText: "#0E0E0E",
    secondaryText: "#494949", tertiaryText: "#9A9A9A", primaryBackground: "#F5F7FF",
    secondaryBackground: "#FFFFFF", tertiaryBackground: "#FAFBFF", backgroundSheet: "#081532b2",
    onTertiaryFill: "#E1EAF8", strokeElements: "#CCCCCC", sheetLine: "#B8BCCA",
    success: "#35D487", attentionRed: "#FD4E4E", shadow: "#000000",
    quaternaryText: "#BBBBBB", onTertiaryBackground: "#000000", onSecondaryBackground: "#000000",
  },
  typography: {}, spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radii: { small: 8, medium: 12, large: 16 },
  scale: { scaleSize: (n: number) => n, scaleHeight: (n: number) => n, scaleWidth: (n: number) => n },
  colorMode: "light",
};

vi.mock("@ion/ui", () => ({
  useTheme: () => mockTheme,
  Icon: "Icon", Text: "Text", Button: "Button", BottomSheet: "BottomSheet",
  TextInput: "TextInput", Box: "Box", HorizontalSeparator: "HorizontalSeparator",
  SearchBar: "SearchBar", SmallButton: "SmallButton",
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));
