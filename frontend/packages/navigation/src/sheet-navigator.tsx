import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import { SheetScreenHeader } from './components/SheetScreenHeader';
import { SheetScrollProvider } from './sheet-scroll-context';
import { SheetBackdrop, SheetBackground, SheetHandle } from '@ion/ui';

const SNAP_POINTS = ['92%'];
const KEYBOARD_BEHAVIOR = Platform.select({ ios: 'padding' as const, default: 'height' as const });
const SHEET_TOP_FRACTION = 0.08;
const FLEX_ONE = { flex: 1 } as const;

function useKeyboardVerticalOffset(): number {
  return useMemo(() => {
    const screenHeight = Dimensions.get('window').height;
    return Math.round(screenHeight * SHEET_TOP_FRACTION);
  }, []);
}

export interface SheetProps {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  titleVisible?: boolean;
  onBack?: (() => void) | undefined;
  headerRightAction?: ReactNode | undefined;
}

function computeTitleOpacity(scrollOffset: number): number {
  if (scrollOffset <= 120) return 0;
  if (scrollOffset >= 140) return 1;
  return (scrollOffset - 120) / 20;
}

function useBottomInsetStyle() {
  const insets = useSafeAreaInsets();
  return useMemo((): ViewStyle => ({ paddingBottom: insets.bottom }), [insets.bottom]);
}

function useScrollTitleOpacity() {
  const [titleOpacity, setTitleOpacity] = useState(0);
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setTitleOpacity(computeTitleOpacity(event.nativeEvent.contentOffset.y));
  }, []);
  return { titleOpacity, handleScroll };
}

export function Sheet({ children, onClose, title, titleVisible, onBack, headerRightAction }: SheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { titleOpacity: scrollOpacity, handleScroll } = useScrollTitleOpacity();
  const titleOpacity = titleVisible ? 1 : scrollOpacity;
  const keyboardOffset = useKeyboardVerticalOffset();
  const bottomInsetStyle = useBottomInsetStyle();

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      enableDynamicSizing={false}
      backdropComponent={SheetBackdrop}
      backgroundComponent={SheetBackground}
      handleComponent={SheetHandle}
      onClose={onClose}
    >
      <View style={[FLEX_ONE, bottomInsetStyle]}>
        <SheetScreenHeader title={title} titleOpacity={titleOpacity} onBack={onBack} rightAction={headerRightAction} />
        <KeyboardAvoidingView style={FLEX_ONE} behavior={KEYBOARD_BEHAVIOR} keyboardVerticalOffset={keyboardOffset}>
          <SheetScrollProvider value={handleScroll}>
            {children}
          </SheetScrollProvider>
        </KeyboardAvoidingView>
      </View>
    </BottomSheet>
  );
}
