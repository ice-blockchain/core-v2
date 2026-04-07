import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetBackdrop, SheetBackground, SheetHandle, SheetCloseHeader } from '@ion/ui';
import { useAppNavigation } from './use-app-navigation';

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
          <SheetCloseHeader {...(title ? { title } : {})} showClose={showClose} onClose={handleClose} />
          {children}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
});
