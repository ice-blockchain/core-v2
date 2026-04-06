import { Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import { BackHandler, Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HorizontalSeparator } from "./HorizontalSeparator";
import { Text } from "./Text";
import { BottomNavBarSheetActionRow } from "./BottomNavBarSheetActionRow";
import { useTheme } from "../theme/ThemeProvider";
import type { BottomNavBarSheetAction, BottomNavBarSheetProps } from "./bottom-nav-bar-types";
import { SheetBackdrop } from "./sheet-parts";

const ANIMATION_CONFIG = { duration: 300, easing: Easing.out(Easing.cubic) };
const OFFSCREEN_TRANSLATE = 600;

function useSheetAppearance() {
  const theme = useTheme();
  const radius = theme.scale.scaleRadius(30);
  const bg = useMemo(() => ({ backgroundColor: theme.colors.secondaryBackground, borderTopLeftRadius: radius, borderTopRightRadius: radius }), [theme.colors.secondaryBackground, radius]);
  const handle = useMemo(() => ({ backgroundColor: theme.colors.sheetLine }), [theme.colors.sheetLine]);
  return { bg, handle };
}

function SheetHeader({ title }: { title: string }) {
  const scale = useTheme().scale.scaleSize;
  const style = useMemo(() => ({ paddingTop: scale(20), paddingBottom: scale(16), alignItems: "center" as const }), [scale]);
  return <View style={style}><Text variant="subtitle">{title}</Text></View>;
}

function SheetContent({ title, actions }: { title: string; actions: readonly BottomNavBarSheetAction[] }) {
  const scale = useTheme().scale.scaleSize;
  return (
    <>
      <SheetHeader title={title} />
      <View style={{ gap: scale(12) }}>
        {actions.map((action, index) => (
          <Fragment key={action.iconName}>
            {index > 0 ? <HorizontalSeparator /> : null}
            <BottomNavBarSheetActionRow action={action} />
          </Fragment>
        ))}
      </View>
    </>
  );
}

function useSheetPresenter(isVisible: boolean, modalRef: React.RefObject<BottomSheetModal | null>) {
  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => modalRef.current?.present());
    }
  }, [isVisible, modalRef]);
}

function useInlineBackHandler(isVisible: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isVisible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { onClose(); return true; });
    return () => sub.remove();
  }, [isVisible, onClose]);
}

function buildInlineBackdropStyle(bgColor: string) {
  return { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: bgColor };
}

interface InlineSheetStyleOptions {
  scale: (n: number) => number;
  bgColor: string;
  radius: number;
}

function buildInlineSheetStyle({ scale, bgColor, radius }: InlineSheetStyleOptions) {
  return {
    position: "absolute" as const, bottom: 0, left: 0, right: 0,
    backgroundColor: bgColor, borderTopLeftRadius: radius, borderTopRightRadius: radius,
    gap: scale(12), paddingBottom: scale(12),
  };
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function useInlineAnimation(isVisible: boolean) {
  const progress = useSharedValue(0);
  const sheetHeight = useSharedValue(OFFSCREEN_TRANSLATE);

  useEffect(() => {
    progress.value = withTiming(isVisible ? 1 : 0, ANIMATION_CONFIG);
  }, [isVisible, progress]);

  const backdropAnimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetAnimStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * sheetHeight.value }] }));
  const handleLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => { sheetHeight.value = e.nativeEvent.layout.height; }, [sheetHeight]);

  return { backdropAnimStyle, sheetAnimStyle, handleLayout };
}

function InlineSheet({ isVisible, onClose, title, actions }: BottomNavBarSheetProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { bg } = useSheetAppearance();
  useInlineBackHandler(isVisible, onClose);
  const backdropStyle = useMemo(() => buildInlineBackdropStyle(theme.colors.backgroundSheet), [theme.colors.backgroundSheet]);
  const sheetStyle = useMemo(() => buildInlineSheetStyle({ scale, bgColor: bg.backgroundColor, radius: bg.borderTopLeftRadius }), [scale, bg]);
  const { backdropAnimStyle, sheetAnimStyle, handleLayout } = useInlineAnimation(isVisible);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isVisible ? "auto" : "none"}>
      <AnimatedPressable style={[backdropStyle, backdropAnimStyle]} onPress={onClose} />
      <Animated.View style={[sheetStyle, sheetAnimStyle]} onLayout={handleLayout}>
        <SheetContent title={title} actions={actions} />
      </Animated.View>
    </View>
  );
}

function ModalSheet({ isVisible, onClose, title, actions }: BottomNavBarSheetProps) {
  const insets = useSafeAreaInsets();
  const { bg, handle } = useSheetAppearance();
  const modalRef = useRef<BottomSheetModal>(null);
  const bottomStyle = useMemo(() => ({ paddingBottom: insets.bottom }), [insets.bottom]);
  useSheetPresenter(isVisible, modalRef);

  const handleAnimate = useCallback((_from: number, to: number) => {
    if (to === -1) onClose();
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <BottomSheetModal ref={modalRef} enableDynamicSizing enablePanDownToClose onAnimate={handleAnimate} backdropComponent={SheetBackdrop} backgroundStyle={bg} handleIndicatorStyle={handle}>
      <BottomSheetView style={bottomStyle}>
        <SheetContent title={title} actions={actions} />
      </BottomSheetView>
    </BottomSheetModal>
  );
}

export function BottomNavBarSheet(props: BottomNavBarSheetProps) {
  if (props.inline) return <InlineSheet {...props} />;
  return <ModalSheet {...props} />;
}
