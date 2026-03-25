import { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
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

export function BottomSheet(props: BottomSheetProps) {
  const { isVisible, onClose, title, onBack, bottomButton, children, testID } = props;
  const { overlayStyle, sheetStyle, handleStyle } = useBottomSheetStyles();
  const [titleOpacity, setTitleOpacity] = useState(0);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setTitleOpacity(computeTitleOpacity(event.nativeEvent.contentOffset.y));
  }, []);

  return (
    <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose} testID={testID}>
      <Pressable style={overlayStyle} onPress={onClose}>
        <View style={handleStyle} />
        <Pressable style={sheetStyle} onPress={undefined}>
          <BottomSheetHeader title={title} titleOpacity={titleOpacity} onBack={onBack} />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={KEYBOARD_BEHAVIOR}>
            <ScrollView
              onScroll={handleScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              {children}
            </ScrollView>
            {bottomButton ? <BottomSheetFooter>{bottomButton}</BottomSheetFooter> : null}
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export type { BottomSheetProps } from "./bottom-sheet-types";
