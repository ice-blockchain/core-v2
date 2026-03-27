import { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { BottomSheetHeader } from "./BottomSheetHeader";
import { BottomSheetFooter } from "./BottomSheetFooter";
import type { BottomSheetProps } from "./bottom-sheet-types";
import { buildOverlayStyle, buildSheetStyle, buildHandleStyle, computeTitleOpacity } from "./bottom-sheet-styles";

const KEYBOARD_BEHAVIOR = Platform.select({ ios: "padding" as const, default: "height" as const });

function useBottomSheetStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const overlayStyle = useMemo(() => buildOverlayStyle(theme.colors.backgroundSheet), [theme.colors.backgroundSheet]);
  const sheetStyle = useMemo(() => buildSheetStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors]);
  const handleStyle = useMemo(() => buildHandleStyle(scale, theme.colors.sheetLine), [scale, theme.colors]);

  return { overlayStyle, sheetStyle, handleStyle };
}

function buildFloatingFooterStyle(bottomInset: number, scale: (n: number) => number): ViewStyle {
  return {
    position: "absolute",
    bottom: scale(10) + bottomInset,
    left: 0,
    right: 0,
    paddingHorizontal: scale(44),
  };
}

function SheetContent(props: BottomSheetProps) {
  const { title, onBack, bottomButton, floatingFooter, children } = props;
  const { sheetStyle } = useBottomSheetStyles();
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const [titleOpacity, setTitleOpacity] = useState(0);
  const insets = useSafeAreaInsets();
  const floatingFooterStyle = useMemo(() => buildFloatingFooterStyle(insets.bottom, scale), [insets.bottom, scale]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setTitleOpacity(computeTitleOpacity(event.nativeEvent.contentOffset.y));
  }, []);

  return (
    <Pressable style={sheetStyle} onPress={undefined}>
      <BottomSheetHeader title={title} titleOpacity={titleOpacity} onBack={onBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={KEYBOARD_BEHAVIOR}>
        <ScrollView onScroll={handleScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          {children}
        </ScrollView>
        {bottomButton ? <BottomSheetFooter>{bottomButton}</BottomSheetFooter> : null}
      </KeyboardAvoidingView>
      {floatingFooter ? <View style={floatingFooterStyle}>{floatingFooter}</View> : null}
    </Pressable>
  );
}

export function BottomSheet(props: BottomSheetProps) {
  const { isVisible, onClose, testID } = props;
  const { overlayStyle, handleStyle } = useBottomSheetStyles();

  return (
    <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose} testID={testID}>
      <Pressable style={overlayStyle} onPress={onClose}>
        <View style={handleStyle} />
        <SheetContent {...props} />
      </Pressable>
    </Modal>
  );
}

export type { BottomSheetProps } from "./bottom-sheet-types";
