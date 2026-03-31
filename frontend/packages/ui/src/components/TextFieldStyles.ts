import type { ViewStyle, TextStyle } from "react-native";
import type { SemanticColors, ThemeTypography } from "../theme/theme-types";
import type { ScaleFunctions } from "../scaling/scaling-types";

export type TextFieldState = "default" | "focused" | "filled" | "error" | "verified" | "disabled";
export type TextFieldTextVariant = "default" | "large";

export interface TextFieldColorSpec {
  borderColor: string;
  labelColor: string;
  valueColor: string;
  backgroundColor: string;
  placeholderColor: string;
  containerOpacity: number;
}

function resolveBorderColor(colors: SemanticColors, state: TextFieldState): string {
  if (state === "focused") return colors.primaryAccent;
  if (state === "error") return colors.attentionRed;
  if (state === "verified") return colors.success;
  return colors.strokeElements;
}

function resolveLabelColor(colors: SemanticColors, state: TextFieldState): string {
  if (state === "focused") return colors.primaryAccent;
  if (state === "error") return colors.attentionRed;
  return colors.tertiaryText;
}

export function resolveTextFieldColorSpec(colors: SemanticColors, state: TextFieldState): TextFieldColorSpec {
  return {
    borderColor: resolveBorderColor(colors, state),
    labelColor: resolveLabelColor(colors, state),
    valueColor: colors.primaryText,
    backgroundColor: colors.secondaryBackground,
    placeholderColor: colors.tertiaryText,
    containerOpacity: state === "disabled" ? 0.5 : 1,
  };
}

const BASE_HEIGHT = 58;
const HORIZONTAL_PADDING = 16;
const BORDER_RADIUS = 16;
const BODY_LINE_HEIGHT = 18;
const FLOATING_LABEL_PADDING = 16;
const FLOATING_LABEL_PADDING_LARGE = 22;
const MULTILINE_PADDING_TOP = 24;
const MULTILINE_PADDING_BOTTOM = 8;

interface ContainerStyleOptions {
  spec: TextFieldColorSpec;
  scale: ScaleFunctions;
  maxLines?: number;
  minLines?: number;
}

export function buildTextFieldContainerStyle(options: ContainerStyleOptions): ViewStyle {
  const { spec, scale, maxLines = 1, minLines = 1 } = options;
  const baseHeight = scale.scaleSize(BASE_HEIGHT);
  const isMultiline = maxLines > 1 || minLines > 1;

  const style: ViewStyle = {
    borderRadius: scale.scaleRadius(BORDER_RADIUS),
    borderWidth: 1,
    borderColor: spec.borderColor,
    backgroundColor: spec.backgroundColor,
    flexDirection: "row",
    paddingHorizontal: scale.scaleSize(HORIZONTAL_PADDING),
    opacity: spec.containerOpacity,
  };

  if (isMultiline) {
    const lineHeight = scale.scaleFont(BODY_LINE_HEIGHT);
    const effectiveMin = Math.max(minLines, 1);
    style.minHeight = baseHeight + lineHeight * (effectiveMin - 1);
    style.alignItems = "flex-start";
  } else {
    style.height = baseHeight;
    style.alignItems = "center";
  }

  return style;
}

interface InputStyleOptions {
  spec: TextFieldColorSpec;
  isFloating: boolean;
  isMultiline: boolean;
  maxLines: number;
  typography: ThemeTypography;
  scale: ScaleFunctions;
  textVariant?: TextFieldTextVariant;
}

interface FontStyleOptions {
  typography: ThemeTypography;
  scale: ScaleFunctions;
  color: string;
  textVariant?: TextFieldTextVariant | undefined;
}

function buildFontStyle(options: FontStyleOptions): TextStyle {
  const { typography, scale, color, textVariant = "default" } = options;
  if (textVariant === "large") {
    return {
      fontFamily: typography.subtitle2.fontFamily,
      fontSize: scale.scaleFont(15),
      lineHeight: scale.scaleFont(18),
      letterSpacing: 0,
      color,
    };
  }
  const body = typography.body;
  return {
    fontFamily: body.fontFamily,
    fontSize: scale.scaleFont(body.fontSize),
    lineHeight: body.lineHeight ? scale.scaleFont(body.lineHeight) : undefined,
    letterSpacing: body.letterSpacing,
    color,
  };
}

// @ts-expect-error outlineStyle is a web-only CSS property not in RN TextStyle
const WEB_INPUT_RESET: TextStyle = { outlineStyle: "none" };

export function buildTextFieldInputStyle(options: InputStyleOptions): TextStyle {
  const { spec, isFloating, isMultiline, maxLines, typography, scale, textVariant } = options;
  const font = buildFontStyle({ typography, scale, color: spec.valueColor, textVariant });

  if (!isMultiline) {
    const padding = textVariant === "large" ? FLOATING_LABEL_PADDING_LARGE : FLOATING_LABEL_PADDING;
    const labelPadding = scale.scaleSize(padding);
    return { ...font, ...WEB_INPUT_RESET, flex: 1, paddingTop: isFloating ? labelPadding : 0, paddingBottom: 0, paddingHorizontal: 0, textAlignVertical: "auto" };
  }

  const lineHeight = scale.scaleFont(BODY_LINE_HEIGHT);
  const paddingTop = scale.scaleSize(MULTILINE_PADDING_TOP);
  const paddingBottom = scale.scaleSize(MULTILINE_PADDING_BOTTOM);
  return {
    ...font,
    ...WEB_INPUT_RESET,
    maxHeight: paddingTop + lineHeight * maxLines + paddingBottom,
    paddingTop: isFloating ? paddingTop : 0,
    paddingBottom,
    paddingHorizontal: 0,
    textAlignVertical: "top",
  };
}

interface DeriveStateOptions {
  explicitState: "error" | "verified" | "disabled" | undefined;
  isFocused: boolean;
  hasValue: boolean;
}

export function deriveTextFieldState(options: DeriveStateOptions): TextFieldState {
  const { explicitState, isFocused, hasValue } = options;
  if (explicitState === "disabled") return "disabled";
  if (explicitState === "error") return "error";
  if (explicitState === "verified") return "verified";
  if (isFocused) return "focused";
  if (hasValue) return "filled";
  return "default";
}
