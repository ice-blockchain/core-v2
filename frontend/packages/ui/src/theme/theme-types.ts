import type { ScaleFunctions } from "../scaling/scaling-types";

export interface SemanticColors {
  primaryAccent: string;
  primaryText: string;
  secondaryText: string;
  tertiaryText: string;
  quaternaryText: string;
  primaryBackground: string;
  secondaryBackground: string;
  tertiaryBackground: string;
  backgroundSheet: string;
  onPrimaryAccent: string;
  onTertiaryBackground: string;
  onSecondaryBackground: string;
  onTertiaryFill: string;
  strokeElements: string;
  sheetLine: string;
  attentionRed: string;
  success: string;
  shadow: string;
}

export type ColorMode = "light" | "dark";

export interface RawTypographyVariant {
  fontSize: number;
  fontWeight: "400" | "500" | "600" | "700";
  lineHeight: number | undefined;
  letterSpacing: number;
  fontFamily: string;
}

export interface TypographyVariant {
  fontSize: number;
  fontWeight: "400" | "500" | "600" | "700";
  lineHeight: number | undefined;
  letterSpacing: number;
  fontFamily: string;
}

export interface ThemeTypography {
  headline1: TypographyVariant;
  headline2: TypographyVariant;
  title: TypographyVariant;
  subtitle: TypographyVariant;
  subtitle2: TypographyVariant;
  subtitle3: TypographyVariant;
  body: TypographyVariant;
  body2: TypographyVariant;
  caption: TypographyVariant;
  caption2: TypographyVariant;
  caption3: TypographyVariant;
  caption4: TypographyVariant;
  caption5: TypographyVariant;
  caption6: TypographyVariant;
  notificationCaption: TypographyVariant;
}

export type TypographyVariantName = keyof ThemeTypography;

export interface ThemeSpacing {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

export interface ThemeRadii {
  small: number;
  medium: number;
  large: number;
}

export interface Theme {
  colors: SemanticColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  radii: ThemeRadii;
  scale: ScaleFunctions;
  colorMode: ColorMode;
}
