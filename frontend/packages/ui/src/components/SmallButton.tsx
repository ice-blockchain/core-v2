import { Pressable } from "react-native";
import type { StyleProp, ViewStyle, TextStyle } from "react-native";
import { useMemo } from "react";
import type { SemanticColors } from "../theme/theme-types";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";
import { ButtonSpinner } from "./ButtonSpinner";

export type SmallButtonColor = "primary" | "primaryOutlined" | "danger" | "dangerOutlined";
export type SmallButtonIconPosition = "left" | "right" | "center";

export interface SmallButtonProps {
  color?: SmallButtonColor;
  icon?: React.ReactNode;
  iconPosition?: SmallButtonIconPosition;
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
}

function resolveColorSpec(colors: SemanticColors, color: SmallButtonColor, isDisabled: boolean): ColorSpec {
  if (isDisabled) {
    return { background: colors.sheetLine, textColor: colors.onPrimaryAccent, borderColor: undefined };
  }
  const specs: Record<SmallButtonColor, ColorSpec> = {
    primary: { background: colors.primaryAccent, textColor: colors.onPrimaryAccent, borderColor: colors.primaryAccent },
    primaryOutlined: { background: "transparent", textColor: colors.primaryAccent, borderColor: colors.primaryAccent },
    danger: { background: colors.attentionRed, textColor: colors.onPrimaryAccent, borderColor: colors.attentionRed },
    dangerOutlined: { background: "transparent", textColor: colors.attentionRed, borderColor: colors.attentionRed },
  };
  return specs[color];
}

function buildContainerStyle(options: { spec: ColorSpec; isIconOnly: boolean; hasIcon: boolean; scale: (n: number) => number }): ViewStyle {
  const { spec, isIconOnly, hasIcon, scale } = options;
  const scaledHeight = scale(28);

  const base: ViewStyle = {
    height: scaledHeight,
    borderRadius: scale(16),
    backgroundColor: spec.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(3),
  };

  if (spec.borderColor) {
    base.borderWidth = 1.2;
    base.borderColor = spec.borderColor;
  }

  if (isIconOnly) {
    base.width = scaledHeight;
    base.gap = 0;
  } else {
    base.paddingHorizontal = hasIcon ? scale(14) : scale(16);
  }

  return base;
}

function buildTextStyle(spec: ColorSpec): TextStyle {
  return { color: spec.textColor };
}

function renderContent(props: SmallButtonProps, spec: ColorSpec, scale: (n: number) => number): React.ReactNode {
  const { icon, iconPosition = "left", label, isLoading } = props;

  if (isLoading) {
    return <ButtonSpinner color={spec.textColor} size={scale(14)} />;
  }

  const isIconOnly = icon && iconPosition === "center" && !label;
  if (isIconOnly) return icon;

  const textElement = label ? (
    <Text variant="caption" style={buildTextStyle(spec)}>{label}</Text>
  ) : null;

  if (!icon) return textElement;
  if (iconPosition === "right") return <>{textElement}{icon}</>;
  return <>{icon}{textElement}</>;
}

export function SmallButton(props: SmallButtonProps) {
  const theme = useTheme();
  const { color = "primary", isDisabled = false, onPress, style } = props;
  const isIconOnly = Boolean(props.icon) && props.iconPosition === "center" && !props.label;
  const hasIcon = Boolean(props.icon);

  const spec = useMemo(
    () => resolveColorSpec(theme.colors, color, isDisabled),
    [theme.colors, color, isDisabled],
  );

  const containerStyle = useMemo(
    () => buildContainerStyle({ spec, isIconOnly, hasIcon, scale: theme.scale.scaleSize }),
    [spec, isIconOnly, hasIcon, theme.scale],
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
