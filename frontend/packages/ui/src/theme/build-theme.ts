import type {
  Theme,
  ColorMode,
  SemanticColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeRadii,
  TypographyVariant,
  RawTypographyVariant,
} from "./theme-types";
import type { ScaleFunctions } from "../scaling/scaling-types";
import { lightSemanticColors } from "../tokens/semantic-colors";
import { darkSemanticColors } from "../tokens/semantic-colors-dark";
import { typographyVariants } from "../tokens/typography-variants";
import { spacingTokens } from "../tokens/spacing";

interface BuildThemeOptions {
  colorMode: ColorMode;
  scaleFunctions: ScaleFunctions;
  overrides?: Partial<Theme> | undefined;
}

function selectColors(colorMode: ColorMode): SemanticColors {
  if (colorMode === "dark") return darkSemanticColors;
  return lightSemanticColors;
}

function scaleVariant(raw: RawTypographyVariant, scale: ScaleFunctions): TypographyVariant {
  return {
    fontSize: scale.scaleFont(raw.fontSize),
    fontWeight: raw.fontWeight,
    lineHeight: raw.lineHeight !== undefined ? scale.scaleFont(raw.lineHeight) : undefined,
    letterSpacing: raw.letterSpacing,
    fontFamily: raw.fontFamily,
  };
}

function scaleTypography(scale: ScaleFunctions): ThemeTypography {
  const entries = Object.entries(typographyVariants);
  const scaled: Record<string, TypographyVariant> = {};
  for (const [key, raw] of entries) {
    scaled[key] = scaleVariant(raw, scale);
  }
  return scaled as unknown as ThemeTypography;
}

function scaleSpacing(scale: ScaleFunctions): ThemeSpacing {
  const raw = spacingTokens.spacing;
  return {
    xxs: scale.scaleSize(raw.xxs),
    xs: scale.scaleSize(raw.xs),
    sm: scale.scaleSize(raw.sm),
    md: scale.scaleSize(raw.md),
    lg: scale.scaleSize(raw.lg),
    xl: scale.scaleSize(raw.xl),
    xxl: scale.scaleSize(raw.xxl),
    xxxl: scale.scaleSize(raw.xxxl),
  };
}

function scaleRadii(scale: ScaleFunctions): ThemeRadii {
  const raw = spacingTokens.radii;
  return {
    small: scale.scaleRadius(raw.small),
    medium: scale.scaleRadius(raw.medium),
    large: scale.scaleRadius(raw.large),
  };
}

export function buildTheme(options: BuildThemeOptions): Theme {
  const { colorMode, scaleFunctions, overrides } = options;
  const colors = selectColors(colorMode);
  const typography = scaleTypography(scaleFunctions);
  const spacing = scaleSpacing(scaleFunctions);
  const radii = scaleRadii(scaleFunctions);

  const baseTheme: Theme = {
    colors,
    typography,
    spacing,
    radii,
    scale: scaleFunctions,
    colorMode,
  };

  if (!overrides) return baseTheme;

  return {
    ...baseTheme,
    ...overrides,
    colors: { ...baseTheme.colors, ...overrides.colors },
    typography: { ...baseTheme.typography, ...overrides.typography },
    spacing: { ...baseTheme.spacing, ...overrides.spacing },
    radii: { ...baseTheme.radii, ...overrides.radii },
  };
}
