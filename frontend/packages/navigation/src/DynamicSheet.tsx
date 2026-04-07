import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Text, useTheme, SheetBackdrop, SheetBackground, SheetHandle } from '@ion/ui';
import { useAppNavigation } from './use-app-navigation';

interface DynamicSheetHeaderProps {
  title?: string;
  showClose?: boolean;
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

function DynamicSheetHeader({ title, showClose = true, onClose }: DynamicSheetHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildHeaderStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors.secondaryBackground]);
  const spacerStyle = useMemo((): ViewStyle => ({ width: scale(24) }), [scale]);

  return (
    <View style={headerStyle}>
      {showClose ? <View style={spacerStyle} /> : null}
      {title ? <Text variant="subtitle">{title}</Text> : <View />}
      {showClose ? (
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
          <Icon name="sheet-close" size={scale(24)} color={theme.colors.tertiaryText} />
        </Pressable>
      ) : null}
    </View>
  );
}

export interface DynamicSheetProps {
  title?: string;
  showClose?: boolean;
  isDismissable?: boolean;
  onDismiss?: () => void;
  children: ReactNode;
}

function useDismissHandler(onDismiss?: () => void) {
  const navigation = useAppNavigation();
  return useCallback(() => {
    if (onDismiss) { onDismiss(); return; }
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation, onDismiss]);
}

function useBottomInsetStyle() {
  const insets = useSafeAreaInsets();
  return useMemo((): ViewStyle => ({ paddingBottom: insets.bottom }), [insets.bottom]);
}

function StaticBackdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="none" />;
}

export function DynamicSheet({ title, showClose = true, isDismissable = true, onDismiss, children }: DynamicSheetProps) {
  const handleClose = useDismissHandler(onDismiss);
  const handleChange = useCallback((index: number) => {
    if (index === -1 && isDismissable) handleClose();
  }, [handleClose, isDismissable]);
  const bottomInsetStyle = useBottomInsetStyle();

  return (
    <View style={styles.overlay}>
      {isDismissable ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessible={false} />
      ) : (
        <View style={StyleSheet.absoluteFill} />
      )}
      <BottomSheet
        enableDynamicSizing
        enablePanDownToClose={isDismissable}
        backdropComponent={isDismissable ? SheetBackdrop : StaticBackdrop}
        backgroundComponent={SheetBackground}
        handleComponent={SheetHandle}
        onChange={handleChange}
      >
        <BottomSheetView style={bottomInsetStyle}>
          <DynamicSheetHeader {...(title ? { title } : {})} showClose={showClose} onClose={handleClose} />
          {children}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
});
