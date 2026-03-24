// Theme
export { ThemeProvider, useTheme } from "./theme/ThemeProvider";

// Components
export { Box } from "./components/Box";
export type { BoxProps } from "./components/Box";

export { Text } from "./components/Text";
export type { TextProps } from "./components/Text";

export { Button } from "./components/Button";
export type { ButtonProps, ButtonColor, ButtonIconPosition } from "./components/Button";

// Icons
export { Icon } from "./icons/Icon";
export type { IconProps, IconName } from "./icons/Icon";

// Catalog
export { CatalogScreen } from "./catalog/CatalogScreen";

// Tokens
export { colorPalette } from "./tokens/color-palette";
export { gradients } from "./tokens/gradients";

// Types
export type {
  Theme,
  ColorMode,
  SemanticColors,
  TypographyVariant,
  TypographyVariantName,
  ThemeTypography,
  ThemeSpacing,
  ThemeRadii,
} from "./types";

export type { ScaleFunctions, GradientStop } from "./types";
