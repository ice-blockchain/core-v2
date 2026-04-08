import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { buildContainerStyle, buildBackdropStyle } from "./overlay-menu-styles";
import type { OverlayMenuProps } from "./overlay-menu-types";
import { MENU_GAP } from "./overlay-menu-types";

function useDelayedRender(isVisible: boolean) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else if (shouldRender) {
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldRender]);

  return shouldRender;
}

export function OverlayMenu({ isVisible, onClose, children, testID }: OverlayMenuProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const shouldRender = useDelayedRender(isVisible);
  const containerStyle = useMemo(() => buildContainerStyle({ scale, bgColor: theme.colors.tertiaryBackground }), [scale, theme.colors]);
  const backdropStyle = useMemo(() => buildBackdropStyle(), []);
  const menuPositionStyle = useMemo(() => ({ top: scale(MENU_GAP), right: 0 }), [scale]);
  const handleBackdropPress = useCallback(() => onClose(), [onClose]);

  if (!shouldRender) return null;

  return (
    <>
      <Pressable style={[backdropStyle, styles.fixedBackdrop]} onPress={handleBackdropPress} />
      <View style={[styles.menuWrapper, menuPositionStyle, containerStyle]} testID={testID}>
        {children}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fixedBackdrop: { position: "fixed" as "absolute", zIndex: 99 },
  menuWrapper: { position: "absolute", zIndex: 100 },
});
