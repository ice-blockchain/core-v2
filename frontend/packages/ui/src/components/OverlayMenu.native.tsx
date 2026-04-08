import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Modal, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { buildContainerStyle, buildBackdropStyle } from "./overlay-menu-styles";
import type { OverlayMenuProps, AnchorMeasurement } from "./overlay-menu-types";
import { MENU_GAP } from "./overlay-menu-types";

const ANIMATION_DURATION = 400;
const OVERSHOOT = 1.70158;
const MAX_MEASURE_RETRIES = 5;

function measureAnchorNode(node: NonNullable<OverlayMenuProps["anchorRef"]["current"]>): AnchorMeasurement | null {
  const asAny = node as unknown as Record<string, unknown>;
  if (typeof asAny.getBoundingClientRect === "function") {
    const rect = (asAny.getBoundingClientRect as () => DOMRect)();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }
  return null;
}

function useMeasureAnchor(props: Pick<OverlayMenuProps, "anchorRef" | "isVisible">) {
  const { anchorRef, isVisible } = props;
  const [anchor, setAnchor] = useState<AnchorMeasurement | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    if (!isVisible) {
      retryCount.current = 0;
      return;
    }
    const tryMeasure = () => {
      const node = anchorRef.current;
      if (!node) return;
      const result = measureAnchorNode(node);
      if (result && result.width > 0 && result.height > 0) {
        setAnchor(result);
        return;
      }
      if (retryCount.current < MAX_MEASURE_RETRIES) {
        retryCount.current += 1;
        requestAnimationFrame(tryMeasure);
      }
    };
    requestAnimationFrame(tryMeasure);
  }, [isVisible, anchorRef]);

  const reset = useCallback(() => setAnchor(null), []);

  return { anchor, reset };
}

function useOverlayPosition(anchor: AnchorMeasurement | null, scale: (n: number) => number) {
  return useMemo(() => {
    if (!anchor) return null;
    const screen = Dimensions.get("window");
    return { top: anchor.y + anchor.height + scale(MENU_GAP), right: screen.width - (anchor.x + anchor.width) };
  }, [anchor, scale]);
}

function useOverlayAnimation(isVisible: boolean) {
  const scaleValue = useSharedValue(0);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      scaleValue.value = withTiming(1, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.back(OVERSHOOT)) });
    } else if (shouldRender) {
      scaleValue.value = withTiming(0, { duration: ANIMATION_DURATION, easing: Easing.in(Easing.back(OVERSHOOT)) });
      const timer = setTimeout(() => setShouldRender(false), ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isVisible, scaleValue, shouldRender]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }), [scaleValue]);

  return { shouldRender, animatedStyle };
}

export function OverlayMenu({ isVisible, onClose, anchorRef, children, testID }: OverlayMenuProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { anchor, reset: resetAnchor } = useMeasureAnchor({ anchorRef, isVisible });
  const position = useOverlayPosition(anchor, scale);
  const { shouldRender, animatedStyle } = useOverlayAnimation(isVisible);
  const containerStyle = useMemo(() => buildContainerStyle({ scale, bgColor: theme.colors.tertiaryBackground }), [scale, theme.colors]);
  const backdropStyle = useMemo(() => buildBackdropStyle(), []);
  const handleBackdropPress = useCallback(() => onClose(), [onClose]);

  useEffect(() => { if (!shouldRender) resetAnchor(); }, [shouldRender, resetAnchor]);

  if (!shouldRender || !position) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Pressable style={backdropStyle} onPress={handleBackdropPress} />
      <Animated.View style={[{ position: "absolute", top: position.top, right: position.right, transformOrigin: "top right" }, containerStyle, animatedStyle]} testID={testID}>
        {children}
      </Animated.View>
    </Modal>
  );
}
