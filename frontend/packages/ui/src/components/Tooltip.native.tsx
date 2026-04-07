import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import type { TargetLayout, TooltipProps } from './tooltip-types';
import { TooltipArrow } from './TooltipArrow';
import { useTheme } from '../theme/ThemeProvider';

const ANIMATION_DURATION = 150;
const DEFAULT_AUTO_DISMISS_MS = 1500;
const GAP = 8;
const SCREEN_PADDING = 8;
const HIGHLIGHT_PADDING = 4;
const POINTER_HALF_WIDTH = 6;
const POINTER_RIGHT_MARGIN = 25;
const POINTER_MIN_MARGIN = 12;

function useTargetMeasurement(props: Pick<TooltipProps, 'targetRef' | 'isVisible'>) {
  const [layout, setLayout] = useState<TargetLayout | null>(null);

  useEffect(() => {
    if (!props.isVisible || !props.targetRef.current) return;
    // eslint-disable-next-line max-params -- measureInWindow native API requires 4 params
    props.targetRef.current.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) setLayout({ x, y, width: w, height: h });
    });
  }, [props.isVisible, props.targetRef]);

  return layout;
}

function useTooltipAnimation(isVisible: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;
  const animatedScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: isVisible ? 1 : 0, duration: ANIMATION_DURATION, useNativeDriver: true }),
      Animated.timing(animatedScale, { toValue: isVisible ? 1 : 0.8, duration: ANIMATION_DURATION, useNativeDriver: true }),
    ]).start();
  }, [isVisible, opacity, animatedScale]);

  return { opacity, scale: animatedScale };
}

function useAutoDismiss(isVisible: boolean, onDismiss: () => void, ms: number) {
  useEffect(() => {
    if (!isVisible) return undefined;
    const timer = setTimeout(onDismiss, ms);
    return () => clearTimeout(timer);
  }, [isVisible, onDismiss, ms]);
}

function computeTooltipPosition(layout: TargetLayout, position: 'top' | 'bottom') {
  if (position === 'bottom') return { top: layout.y + layout.height + GAP, left: SCREEN_PADDING };
  return { top: layout.y - GAP, left: SCREEN_PADDING };
}

function computePointerOffset(layout: TargetLayout, pointerAlign: 'left' | 'center' | 'right') {
  const targetCenter = layout.x - SCREEN_PADDING + layout.width / 2;
  if (pointerAlign === 'center') return { marginLeft: targetCenter - POINTER_HALF_WIDTH };
  if (pointerAlign === 'right') return { alignSelf: 'flex-end' as const, marginRight: POINTER_RIGHT_MARGIN };
  return { marginLeft: Math.max(POINTER_MIN_MARGIN, targetCenter - POINTER_HALF_WIDTH) };
}

function TargetHighlight({ layout, children }: { layout: TargetLayout; children?: React.ReactNode }) {
  const theme = useTheme();
  const highlightStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: layout.y - HIGHLIGHT_PADDING,
      left: layout.x - HIGHLIGHT_PADDING,
      paddingHorizontal: HIGHLIGHT_PADDING,
      paddingVertical: HIGHLIGHT_PADDING,
      borderRadius: theme.scale.scaleRadius(18),
      backgroundColor: theme.colors.secondaryBackground,
    }),
    [layout, theme],
  );

  return <View style={highlightStyle}>{children}</View>;
}

function TooltipContent({ props, layout }: { props: TooltipProps; layout: TargetLayout }) {
  const { position = 'top', pointerAlign = 'left', highlightContent, children } = props;
  const theme = useTheme();
  const { opacity, scale } = useTooltipAnimation(props.isVisible);
  const posStyle = computeTooltipPosition(layout, position);
  const pointerStyle = computePointerOffset(layout, pointerAlign);

  return (
    <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.backgroundSheet }]} onPress={props.onDismiss}>
      <TargetHighlight layout={layout}>{highlightContent}</TargetHighlight>
      <Animated.View style={[styles.tooltipContainer, posStyle, { opacity, transform: [{ scale }] }]}>
        {position === 'bottom' && <View style={pointerStyle}><TooltipArrow direction="up" /></View>}
        {children}
        {position === 'top' && <View style={pointerStyle}><TooltipArrow direction="down" /></View>}
      </Animated.View>
    </Pressable>
  );
}

export function Tooltip(props: TooltipProps) {
  const { isVisible, onDismiss, autoDismissMs = DEFAULT_AUTO_DISMISS_MS } = props;
  const layout = useTargetMeasurement(props);
  const stableOnDismiss = useCallback(() => onDismiss(), [onDismiss]);
  useAutoDismiss(isVisible, stableOnDismiss, autoDismissMs);

  if (!isVisible || !layout) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={stableOnDismiss}>
      <TooltipContent props={{ ...props, onDismiss: stableOnDismiss }} layout={layout} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  tooltipContainer: { position: 'absolute', right: SCREEN_PADDING },
});
