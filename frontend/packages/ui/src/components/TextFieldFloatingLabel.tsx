import { useEffect, useRef } from "react";
import { Animated } from "react-native";
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

const ANIMATION_DURATION = 150;
const RESTING_FONT_SIZE = 13;
const FLOATING_FONT_SIZE = 12;
const FLOATING_TOP = 8;
const RESTING_TOP = 18;

function useFloatingAnimation(isFloating: boolean) {
  const progress = useRef(new Animated.Value(isFloating ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isFloating ? 1 : 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  }, [isFloating, progress]);

  return progress;
}

function buildSingleLineStyle(options: {
  progress: Animated.Value;
  color: string;
  typography: ThemeTypography;
  scale: ScaleFunctions;
}) {
  const { progress, color, typography, scale } = options;
  const restingFontSize = scale.scaleFont(RESTING_FONT_SIZE);
  const floatingFontSize = scale.scaleFont(FLOATING_FONT_SIZE);

  return {
    position: "absolute" as const,
    left: 0,
    right: 0,
    alignSelf: "center" as const,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -scale.scaleSize(FLOATING_TOP)] }) }],
    fontSize: progress.interpolate({ inputRange: [0, 1], outputRange: [restingFontSize, floatingFontSize] }),
    fontFamily: typography.body.fontFamily,
    fontWeight: "500" as const,
    color,
  };
}

function buildMultilineStyle(options: {
  progress: Animated.Value;
  color: string;
  typography: ThemeTypography;
  scale: ScaleFunctions;
}) {
  const { progress, color, typography, scale } = options;
  const restingFontSize = scale.scaleFont(RESTING_FONT_SIZE);
  const floatingFontSize = scale.scaleFont(FLOATING_FONT_SIZE);

  return {
    position: "absolute" as const,
    left: 0,
    right: 0,
    top: progress.interpolate({ inputRange: [0, 1], outputRange: [scale.scaleSize(RESTING_TOP), scale.scaleSize(FLOATING_TOP)] }),
    fontSize: progress.interpolate({ inputRange: [0, 1], outputRange: [restingFontSize, floatingFontSize] }),
    fontFamily: typography.body.fontFamily,
    fontWeight: "500" as const,
    color,
  };
}

export function TextFieldFloatingLabel(props: TextFieldFloatingLabelProps) {
  const { label, isFloating, isMultiline = false, color, typography, scale } = props;
  const progress = useFloatingAnimation(isFloating);

  const animatedStyle = isMultiline
    ? buildMultilineStyle({ progress, color, typography, scale })
    : buildSingleLineStyle({ progress, color, typography, scale });

  return (
    <Animated.Text numberOfLines={1} style={animatedStyle}>
      {label}
    </Animated.Text>
  );
}
