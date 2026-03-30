import { Pressable } from "react-native";
import type { StyleProp, ViewStyle, TextStyle } from "react-native";
import { useMemo } from "react";
import type { SemanticColors } from "../theme/theme-types";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";
import { IONLoader } from "./IONLoader";
import type { IONLoaderVariant } from "./IONLoaderTypes";

export type ButtonColor = "primary" | "secondary" | "secondaryB" | "tertiary" | "text";
export type ButtonIconPosition = "left" | "right" | "center";

export interface ButtonProps {
  height?: 44 | 56;
  color?: ButtonColor;
  icon?: React.ReactNode;
  iconPosition?: ButtonIconPosition;
  label?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

interface ColorSpec {
  background: string;
  textColor: string;
  borderColor: string | undefined;
  loaderVariant: IONLoaderVariant;
}

function resolveColorSpec(colors: SemanticColors, color: ButtonColor, isDisabled: boolean): ColorSpec {
  if (isDisabled) {
    return { background: colors.sheetLine, textColor: colors.onPrimaryAccent, borderColor: undefined, loaderVariant: "dark" };
  }
  const specs: Record<ButtonColor, ColorSpec> = {
    primary: { background: colors.primaryAccent, textColor: colors.onPrimaryAccent, borderColor: undefined, loaderVariant: "dark" },
    secondary: { background: colors.tertiaryBackground, textColor: colors.primaryText, borderColor: undefined, loaderVariant: "light" },
    secondaryB: { background: colors.tertiaryBackground, textColor: colors.primaryText, borderColor: undefined, loaderVariant: "light" },
    tertiary: { background: "transparent", textColor: colors.secondaryText, borderColor: colors.strokeElements, loaderVariant: "light" },
    text: { background: "transparent", textColor: colors.secondaryText, borderColor: undefined, loaderVariant: "light" },
  };
  return specs[color];
}

function buildContainerStyle(options: { height: 44 | 56; spec: ColorSpec; isIconOnly: boolean; scale: (n: number) => number }): ViewStyle {
  const { height, spec, isIconOnly, scale } = options;
  const radius = height === 44 ? scale(12) : scale(16);
  const scaledHeight = scale(height);

  const base: ViewStyle = {
    height: scaledHeight,
    borderRadius: radius,
    backgroundColor: spec.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: height === 44 ? scale(8) : scale(9),
  };

  if (spec.borderColor) {
    base.borderWidth = 1;
    base.borderColor = spec.borderColor;
  }

  if (isIconOnly) {
    base.width = scaledHeight;
    base.gap = 0;
  } else if (height === 56) {
    base.alignSelf = "stretch";
    base.paddingHorizontal = scale(16);
  } else {
    base.paddingHorizontal = scale(16);
    base.paddingVertical = scale(10);
  }

  return base;
}

function buildTextStyle(spec: ColorSpec): TextStyle {
  return { color: spec.textColor };
}

function resolveLoaderSize(height: 44 | 56): number {
  return height === 56 ? 24 : 20;
}

function renderContent(props: ButtonProps, spec: ColorSpec, scale: (n: number) => number): React.ReactNode {
  const { height = 56, icon, iconPosition = "left", label, isLoading } = props;

  if (isLoading) {
    return <IONLoader variant={spec.loaderVariant} size={scale(resolveLoaderSize(height))} />;
  }

  const isIconOnly = icon && iconPosition === "center" && !label;
  if (isIconOnly) return icon;

  const textElement = label ? (
    <Text variant="body" style={buildTextStyle(spec)}>{label}</Text>
  ) : null;

  if (!icon) return textElement;
  if (iconPosition === "right") return <>{textElement}{icon}</>;
  return <>{icon}{textElement}</>;
}

export function Button(props: ButtonProps) {
  const theme = useTheme();
  const { height = 56, color = "primary", isDisabled = false, onPress, style } = props;
  const isIconOnly = Boolean(props.icon) && props.iconPosition === "center" && !props.label;

  const spec = useMemo(
    () => resolveColorSpec(theme.colors, color, isDisabled),
    [theme.colors, color, isDisabled],
  );

  const containerStyle = useMemo(
    () => buildContainerStyle({ height, spec, isIconOnly, scale: theme.scale.scaleSize }),
    [height, spec, isIconOnly, theme.scale],
  );

  return (
    <Pressable
      style={({ pressed }) => [containerStyle, pressed && !isDisabled && { opacity: 0.8 }, style]}
      onPress={onPress}
      disabled={isDisabled || props.isLoading}
    >
      {renderContent(props, spec, theme.scale.scaleSize)}
    </Pressable>
  );
}
