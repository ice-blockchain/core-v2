import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import type { TargetLayout, TooltipProps } from './tooltip-types';
import { TooltipArrow } from './TooltipArrow';
import { useTheme } from '../theme/ThemeProvider';

const ANIMATION_DURATION = 150;
const DEFAULT_AUTO_DISMISS_MS = 1500;
const DESIGN_GAP = 8;
const DESIGN_SCREEN_PADDING = 8;
const DESIGN_HIGHLIGHT_PADDING = 4;
const DESIGN_POINTER_HALF_WIDTH = 6;
const DESIGN_POINTER_RIGHT_MARGIN = 25;
const DESIGN_POINTER_MIN_MARGIN = 12;
const DESIGN_HIGHLIGHT_RADIUS = 18;

type ScaleFn = (n: number) => number;

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

function computeTooltipPosition(layout: TargetLayout, position: 'top' | 'bottom', scale: ScaleFn) {
  const gap = scale(DESIGN_GAP);
  const padding = scale(DESIGN_SCREEN_PADDING);
  if (position === 'bottom') return { top: layout.y + layout.height + gap, left: padding };
  return { top: layout.y - gap, left: padding };
}

function computePointerOffset(layout: TargetLayout, pointerAlign: 'left' | 'center' | 'right', scale: ScaleFn) {
  const padding = scale(DESIGN_SCREEN_PADDING);
  const halfWidth = scale(DESIGN_POINTER_HALF_WIDTH);
  const targetCenter = layout.x - padding + layout.width / 2;
  if (pointerAlign === 'center') return { marginLeft: targetCenter - halfWidth };
  if (pointerAlign === 'right') return { alignSelf: 'flex-end' as const, marginRight: scale(DESIGN_POINTER_RIGHT_MARGIN) };
  return { marginLeft: Math.max(scale(DESIGN_POINTER_MIN_MARGIN), targetCenter - halfWidth) };
}

function TargetHighlight({ layout, scale, children }: { layout: TargetLayout; scale: ScaleFn; children?: React.ReactNode }) {
  const theme = useTheme();
  const pad = scale(DESIGN_HIGHLIGHT_PADDING);
  const highlightStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: layout.y - pad,
      left: layout.x - pad,
      paddingHorizontal: pad,
      paddingVertical: pad,
      borderRadius: theme.scale.scaleRadius(DESIGN_HIGHLIGHT_RADIUS),
      backgroundColor: theme.colors.secondaryBackground,
    }),
    [layout, pad, theme],
  );

  return <View style={highlightStyle}>{children}</View>;
}

function TooltipContent({ props, layout }: { props: TooltipProps; layout: TargetLayout }) {
  const { position = 'top', pointerAlign = 'left', highlightContent, children } = props;
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { opacity, scale: animScale } = useTooltipAnimation(props.isVisible);
  const posStyle = computeTooltipPosition(layout, position, scale);
  const pointerStyle = computePointerOffset(layout, pointerAlign, scale);

  return (
    <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.backgroundSheet }]} onPress={props.onDismiss}>
      <TargetHighlight layout={layout} scale={scale}>{highlightContent}</TargetHighlight>
      <Animated.View style={[styles.tooltipContainer, posStyle, { opacity, transform: [{ scale: animScale }], right: scale(DESIGN_SCREEN_PADDING) }]}>
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
  tooltipContainer: { position: 'absolute' },
});
