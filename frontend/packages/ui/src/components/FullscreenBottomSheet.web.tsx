import { forwardRef, useImperativeHandle, useMemo } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { buildWebOverlayStyle, buildWebSheetStyle, buildHandleStyle } from "./bottom-sheet-styles";
import type { FullscreenBottomSheetProps, FullscreenBottomSheetRef } from "./fullscreen-bottom-sheet-types";

const BACKDROP_STYLE = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

export const FullscreenBottomSheet = forwardRef<FullscreenBottomSheetRef, FullscreenBottomSheetProps>(
  function FullscreenBottomSheet({ isVisible, onClose, enableDynamicSizing, children }, ref) {
    useImperativeHandle(ref, () => ({
      present: () => {},
      dismiss: onClose,
      snapToIndex: () => {},
    }), [onClose]);

    const theme = useTheme();
    const scale = theme.scale.scaleSize;
    const overlayStyle = useMemo(() => buildWebOverlayStyle(theme.colors.backgroundSheet), [theme.colors]);
    const sheetStyle = useMemo(() => buildWebSheetStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors]);
    const handleStyle = useMemo(() => buildHandleStyle(scale, theme.colors.sheetLine), [scale, theme.colors]);

    if (!isVisible) return null;

    return (
      <View style={overlayStyle}>
        <Pressable style={BACKDROP_STYLE} onPress={onClose} />
        <View style={handleStyle} />
        <View style={enableDynamicSizing ? sheetStyle : [sheetStyle, { flex: 1 }]}>
          {children}
        </View>
      </View>
    );
  },
);
