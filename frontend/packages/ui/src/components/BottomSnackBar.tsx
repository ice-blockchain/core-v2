import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { View, Animated, Easing, Pressable, AccessibilityInfo, Platform } from "react-native";
import type { ViewStyle, TextStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";
import { Icon } from "../icons/Icon";

/** Props for the BottomSnackBar component. */
export interface BottomSnackBarProps {
  message: string;
  isVisible: boolean;
  onDismiss: () => void;
  durationMs?: number;
}

const DEFAULT_DURATION = 3000;
const ANIMATION_DURATION = 300;

function IconBadge(props: {
  backgroundColor: string;
  iconColor: string;
  scale: (n: number) => number;
}) {
  const { backgroundColor, iconColor, scale } = props;

  const badgeStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor,
      borderRadius: scale(8),
      padding: scale(5),
      alignItems: "center",
      justifyContent: "center",
    }),
    [backgroundColor, scale],
  );

  return (
    <View style={badgeStyle}>
      <Icon name="clock" size={scale(16)} color={iconColor} />
    </View>
  );
}

function useSlideAnimation(isVisible: boolean, onHideComplete: () => void) {
  const progress = useRef(new Animated.Value(0)).current;
  const onHideCompleteRef = useRef(onHideComplete);
  onHideCompleteRef.current = onHideComplete;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isVisible ? 1 : 0,
      duration: ANIMATION_DURATION,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !isVisible) {
        onHideCompleteRef.current();
      }
    });
  }, [isVisible, progress]);

  return progress;
}

function useAutoDismiss(isVisible: boolean, durationMs: number, onDismiss: () => void) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => onDismissRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [isVisible, durationMs]);
}

function useSnackPresence(isVisible: boolean, message: string) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsMounted(true);
      if (Platform.OS !== "web") {
        AccessibilityInfo.announceForAccessibility(message);
      }
    }
  }, [isVisible, message]);

  const handleHideComplete = useCallback(() => {
    setIsMounted(false);
  }, []);

  return { isMounted, handleHideComplete };
}

function useSnackStyles(colors: { primaryAccent: string; onPrimaryAccent: string }, scaleSize: (n: number) => number) {
  const containerStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: colors.primaryAccent,
      borderRadius: scaleSize(12),
      paddingLeft: scaleSize(8),
      paddingRight: scaleSize(12),
      paddingVertical: scaleSize(8),
      flexDirection: "row",
      alignItems: "center",
      gap: scaleSize(10),
      shadowColor: colors.primaryAccent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.36,
      shadowRadius: 20,
      elevation: 8,
    }),
    [colors.primaryAccent, scaleSize],
  );

  const textStyle = useMemo<TextStyle>(
    () => ({ color: colors.onPrimaryAccent, flex: 1 }),
    [colors.onPrimaryAccent],
  );

  return { containerStyle, textStyle };
}

/** Animated snack bar that appears at the bottom of the screen and auto-dismisses after a configurable duration. */
export function BottomSnackBar(props: BottomSnackBarProps) {
  const { message, isVisible, onDismiss, durationMs = DEFAULT_DURATION } = props;
  const theme = useTheme();
  const scaleSize = theme.scale.scaleSize;
  const { isMounted, handleHideComplete } = useSnackPresence(isVisible, message);
  const progress = useSlideAnimation(isVisible, handleHideComplete);
  useAutoDismiss(isVisible, durationMs, onDismiss);
  const { containerStyle, textStyle } = useSnackStyles(theme.colors, scaleSize);

  if (!isMounted) return null;

  const animatedStyle = {
    opacity: progress,
transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [scaleSize(20), 0] }) }],  
};

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={onDismiss} style={containerStyle} accessibilityRole="alert" accessibilityLabel={message}>
        <IconBadge backgroundColor={theme.colors.onPrimaryAccent} iconColor={theme.colors.primaryAccent} scale={scaleSize} />
        <Text variant="body" style={textStyle} numberOfLines={1}>{message}</Text>
      </Pressable>
    </Animated.View>
  );
}