import { useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Text, useTheme, SheetBackdrop, SheetBackground, SheetHandle } from '@ion/ui';
import { useAppNavigation } from './use-app-navigation';

interface DynamicSheetHeaderProps {
  title?: string;
  showClose?: boolean;
  onBack?: () => void;
  onClose: () => void;
}

function buildHeaderStyle(theme: ReturnType<typeof useTheme>): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderTopLeftRadius: scale(30),
    borderTopRightRadius: scale(30),
    backgroundColor: theme.colors.secondaryBackground,
  };
}

function DynamicSheetHeader({ title, showClose = true, onBack, onClose }: DynamicSheetHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildHeaderStyle(theme), [theme]);
  const spacerStyle = useMemo((): ViewStyle => ({ width: scale(24) }), [scale]);

  if (!showClose && !title && !onBack) return null;

  return (
    <View style={headerStyle}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button">
          <Icon name="back-arrow" size={scale(24)} color={theme.colors.primaryText} />
        </Pressable>
      ) : (
        <View style={spacerStyle} />
      )}
      {title ? <Text variant="subtitle">{title}</Text> : <View />}
      {showClose ? (
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
          <Icon name="sheet-close" size={scale(24)} color={theme.colors.tertiaryText} />
        </Pressable>
      ) : (
        <View style={spacerStyle} />
      )}
    </View>
  );
}

export interface DynamicSheetProps {
  title?: string;
  showClose?: boolean;
  onBack?: () => void;
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

function useBackdropRenderer(isDismissable: boolean) {
  return useCallback(
    (props: BottomSheetBackdropProps) => (
      <SheetBackdrop {...props} pressBehavior={isDismissable ? 'close' : 'none'} />
    ),
    [isDismissable],
  );
}

function useSheetCloseHandlers(isDismissable: boolean, onDismiss?: () => void) {
  const sheetRef = useRef<BottomSheet>(null);
  const handleClose = useDismissHandler(onDismiss);
  const handleChange = useCallback((index: number) => {
    if (index === -1 && isDismissable) handleClose();
  }, [handleClose, isDismissable]);
  const requestClose = useCallback(() => {
    sheetRef.current?.close();
  }, []);
  return { sheetRef, handleChange, requestClose };
}

export function DynamicSheet({ title, showClose = true, onBack, isDismissable = true, onDismiss, children }: DynamicSheetProps) {
  const { sheetRef, handleChange, requestClose } = useSheetCloseHandlers(isDismissable, onDismiss);
  const bottomInsetStyle = useBottomInsetStyle();
  const renderBackdrop = useBackdropRenderer(isDismissable);

  return (
    <View style={styles.overlay}>
      {isDismissable ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} accessible={false} />
      ) : (
        <View style={StyleSheet.absoluteFill} />
      )}
      <BottomSheet
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose={isDismissable}
        backdropComponent={renderBackdrop}
        backgroundComponent={SheetBackground}
        handleComponent={SheetHandle}
        onChange={handleChange}
      >
        <BottomSheetView style={bottomInsetStyle}>
          <DynamicSheetHeader {...(title ? { title } : {})} {...(onBack ? { onBack } : {})} showClose={showClose} onClose={requestClose} />
          {children}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
});
