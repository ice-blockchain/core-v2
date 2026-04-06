import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { BottomSheetHeader } from "./BottomSheetHeader";
import { BottomSheetFooter } from "./BottomSheetFooter";
import type { BottomSheetProps } from "./bottom-sheet-types";
import { buildWebOverlayStyle, buildWebSheetStyle, buildHandleStyle, computeTitleOpacity } from "./bottom-sheet-styles";
import { useKeyboardInset } from "./bottom-sheet-hooks";

const BACKDROP_STYLE = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

function useWebBottomSheetStyles(inline?: boolean) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const overlayStyle = useMemo(() => buildWebOverlayStyle(theme.colors.backgroundSheet, inline), [theme.colors, inline]);
  const sheetStyle = useMemo(() => buildWebSheetStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors]);
  const handleStyle = useMemo(() => buildHandleStyle(scale, theme.colors.sheetLine), [scale, theme.colors]);

  return { overlayStyle, sheetStyle, handleStyle, scale };
}

function buildFloatingFooterStyle(scale: (n: number) => number, keyboardInset: number, safeAreaBottom: number) {
  return {
    position: "absolute" as const,
    bottom: scale(10) + keyboardInset + safeAreaBottom,
    left: 0,
    right: 0,
    paddingHorizontal: scale(16),
  };
}

function SheetContent(props: BottomSheetProps) {
  const { title, onBack, bottomButton, floatingFooter, children } = props;
  const { sheetStyle, scale } = useWebBottomSheetStyles();
  const keyboardInset = useKeyboardInset();
  const insets = useSafeAreaInsets();
  const [titleOpacity, setTitleOpacity] = useState(0);
  const keyboardStyle = useMemo(() => (keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined), [keyboardInset]);
  const floatingFooterStyle = useMemo(
    () => buildFloatingFooterStyle(scale, keyboardInset, insets.bottom),
    [scale, keyboardInset, insets.bottom],
  );

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setTitleOpacity(computeTitleOpacity(event.nativeEvent.contentOffset.y));
  }, []);

  return (
    <View style={[sheetStyle, { flex: 1 }]}>
      {(title || onBack) ? <BottomSheetHeader title={title} titleOpacity={titleOpacity} onBack={onBack} /> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={keyboardStyle} onScroll={handleScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {bottomButton ? <BottomSheetFooter>{bottomButton}</BottomSheetFooter> : null}
      {floatingFooter ? <View style={floatingFooterStyle}>{floatingFooter}</View> : null}
    </View>
  );
}

export function BottomSheet(props: BottomSheetProps) {
  const { isVisible, onClose, inline, testID } = props;
  const { overlayStyle, handleStyle } = useWebBottomSheetStyles(inline);

  if (!isVisible) return null;

  return (
    <View style={overlayStyle} testID={testID}>
      <Pressable style={BACKDROP_STYLE} onPress={onClose} />
      <View style={handleStyle} />
      <SheetContent {...props} />
      {props.overlay}
    </View>
  );
}

export type { BottomSheetProps } from "./bottom-sheet-types";
