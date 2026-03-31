import { Platform, Text as RNText } from "react-native";
import type { TextProps as RNTextProps, TextStyle } from "react-native";
import { useMemo } from "react";
import type { TypographyVariantName, TypographyVariant } from "../theme/theme-types";
import { useTheme } from "../theme/ThemeProvider";

export interface TextProps extends RNTextProps {
  variant?: TypographyVariantName;
  color?: string;
}

function buildVariantStyle(variant: TypographyVariant, color: string): TextStyle {
  return {
    fontFamily: variant.fontFamily,
    ...(Platform.OS !== "ios" && { fontWeight: variant.fontWeight }),
    fontSize: variant.fontSize,
    lineHeight: variant.lineHeight,
    letterSpacing: variant.letterSpacing,
    color,
  };
}

export function Text(props: TextProps) {
  const theme = useTheme();
  const { variant = "body2", color, style, ...rest } = props;
  const resolvedColor = color ?? theme.colors.primaryText;

  const variantStyle = useMemo(
    () => buildVariantStyle(theme.typography[variant], resolvedColor),
    [theme, variant, resolvedColor],
  );

  return <RNText style={[variantStyle, style]} {...rest} />;
}
