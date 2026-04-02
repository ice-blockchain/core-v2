import { Text } from "react-native";
import type { ThemeTypography } from "../theme/theme-types";
import type { ScaleFunctions } from "../scaling/scaling-types";

export interface TextFieldFloatingLabelProps {
  label: string;
  isFloating: boolean;
  isMultiline?: boolean;
  color: string;
  typography: ThemeTypography;
  scale: ScaleFunctions;
}

const RESTING_FONT_SIZE = 13;
const FLOATING_FONT_SIZE = 12;
const FLOATING_TOP = 8;
const TRANSITION_MS = 150;

export function TextFieldFloatingLabel(props: TextFieldFloatingLabelProps) {
  const { label, isFloating, isMultiline = false, color, typography, scale } = props;
  const fontSize = isFloating ? scale.scaleFont(FLOATING_FONT_SIZE) : scale.scaleFont(RESTING_FONT_SIZE);
  const translateY = isFloating ? -scale.scaleSize(FLOATING_TOP) : 0;
  const top = isMultiline
    ? scale.scaleSize(isFloating ? FLOATING_TOP : 18)
    : undefined;

  return (
    <Text
      numberOfLines={1}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        ...(isMultiline ? { top } : { alignSelf: "center", transform: [{ translateY }] }),
        fontSize,
        fontFamily: typography.caption.fontFamily,
        color,
        // @ts-expect-error -- web-only CSS transition property
        transitionProperty: "font-size, transform, top",
        transitionDuration: `${TRANSITION_MS}ms`,
      }}
    >
      {label}
    </Text>
  );
}
