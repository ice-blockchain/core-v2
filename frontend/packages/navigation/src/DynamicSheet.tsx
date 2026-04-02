import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Icon, Text, useTheme } from '@ion/ui';
import { useAppNavigation } from './use-app-navigation';
import { renderBackdrop, SheetBackground, SheetHandle } from './sheet-parts';

interface DynamicSheetHeaderProps {
  title: string;
  onClose: () => void;
}

function buildHeaderStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: scale(20),
    paddingBottom: scale(16),
    borderTopLeftRadius: scale(30),
    borderTopRightRadius: scale(30),
    backgroundColor,
  };
}

function DynamicSheetHeader({ title, onClose }: DynamicSheetHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildHeaderStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors.secondaryBackground]);
  const spacerStyle = useMemo((): ViewStyle => ({ width: scale(24) }), [scale]);

  return (
    <View style={headerStyle}>
      <View style={spacerStyle} />
      <Text variant="subtitle">{title}</Text>
      <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
        <Icon name="sheet-close" size={scale(24)} color={theme.colors.tertiaryText} />
      </Pressable>
    </View>
  );
}

export interface DynamicSheetProps {
  title: string;
  children: ReactNode;
}

export function DynamicSheet({ title, children }: DynamicSheetProps) {
  const navigation = useAppNavigation();

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const handleChange = useCallback((index: number) => {
    if (index === -1) handleClose();
  }, [handleClose]);

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessible={false} />
      <BottomSheet
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundComponent={SheetBackground}
        handleComponent={SheetHandle}
        onChange={handleChange}
      >
        <BottomSheetView>
          <DynamicSheetHeader title={title} onClose={handleClose} />
          {children}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
});
