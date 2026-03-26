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

  return { overlayStyle, sheetStyle, handleStyle };
}

const FLOATING_FOOTER_STYLE = {
  position: "absolute" as const,
  bottom: 10,
  left: 0,
  right: 0,
  paddingHorizontal: 44,
};

export function BottomSheet(props: BottomSheetProps) {
  const { isVisible, onClose, title, onBack, bottomButton, floatingFooter, children, testID } = props;
  const { overlayStyle, sheetStyle, handleStyle } = useWebBottomSheetStyles();
  const [titleOpacity, setTitleOpacity] = useState(0);
  const keyboardStyle = useKeyboardContentStyle();

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setTitleOpacity(computeTitleOpacity(event.nativeEvent.contentOffset.y));
  }, []);

  if (!isVisible) return null;

  return (
    <View style={overlayStyle} testID={testID}>
      <Pressable style={BACKDROP_STYLE} onPress={onClose} />
      <View style={handleStyle} />
      <View style={sheetStyle}>
        <BottomSheetHeader title={title} titleOpacity={titleOpacity} onBack={onBack} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={keyboardStyle}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {bottomButton ? <BottomSheetFooter>{bottomButton}</BottomSheetFooter> : null}
        {floatingFooter ? <View style={FLOATING_FOOTER_STYLE}>{floatingFooter}</View> : null}
      </View>
    </View>
  );
}

export type { BottomSheetProps } from "./bottom-sheet-types";
