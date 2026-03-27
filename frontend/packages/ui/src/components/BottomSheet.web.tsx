import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { BottomSheetHeader } from "./BottomSheetHeader";
import { BottomSheetFooter } from "./BottomSheetFooter";
import type { BottomSheetProps } from "./bottom-sheet-types";
import { buildWebOverlayStyle, buildWebSheetStyle, buildHandleStyle, computeTitleOpacity } from "./bottom-sheet-styles";
import { useKeyboardContentStyle } from "./bottom-sheet-hooks";

const BACKDROP_STYLE = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

function useWebBottomSheetStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const overlayStyle = useMemo(() => buildWebOverlayStyle(theme.colors.backgroundSheet), [theme.colors]);
  const sheetStyle = useMemo(() => buildWebSheetStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors]);
  const handleStyle = useMemo(() => buildHandleStyle(scale, theme.colors.sheetLine), [scale, theme.colors]);
  const floatingFooterStyle = useMemo(() => buildFloatingFooterStyle(scale), [scale]);

  return { overlayStyle, sheetStyle, handleStyle, floatingFooterStyle };
}

function buildFloatingFooterStyle(scale: (n: number) => number) {
  return {
    position: "absolute" as const,
    bottom: scale(10),
    left: 0,
    right: 0,
    paddingHorizontal: scale(44),
  };
}

function SheetContent(props: BottomSheetProps) {
  const { title, onBack, bottomButton, floatingFooter, children } = props;
  const { sheetStyle, floatingFooterStyle } = useWebBottomSheetStyles();
  const [titleOpacity, setTitleOpacity] = useState(0);
  const keyboardStyle = useKeyboardContentStyle();

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setTitleOpacity(computeTitleOpacity(event.nativeEvent.contentOffset.y));
  }, []);

  return (
    <View style={sheetStyle}>
      <BottomSheetHeader title={title} titleOpacity={titleOpacity} onBack={onBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={keyboardStyle} onScroll={handleScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {bottomButton ? <BottomSheetFooter>{bottomButton}</BottomSheetFooter> : null}
      {floatingFooter ? <View style={floatingFooterStyle}>{floatingFooter}</View> : null}
    </View>
  );
}

export function BottomSheet(props: BottomSheetProps) {
  const { isVisible, onClose, testID } = props;
  const { overlayStyle, handleStyle } = useWebBottomSheetStyles();

  if (!isVisible) return null;

  return (
    <View style={overlayStyle} testID={testID}>
      <Pressable style={BACKDROP_STYLE} onPress={onClose} />
      <View style={handleStyle} />
      <SheetContent {...props} />
    </View>
  );
}

export type { BottomSheetProps } from "./bottom-sheet-types";
