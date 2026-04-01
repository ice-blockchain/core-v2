import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import type {
  BottomSheetBackdropProps,
  BottomSheetBackgroundProps,
  BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import { colorPalette } from '@ion/ui';
import { SheetScreenHeader } from "./components/SheetScreenHeader";
import { SheetScrollProvider } from "./sheet-scroll-context";

const SNAP_POINTS = ['92%'];
const BACKDROP_COLOR = 'rgba(8, 21, 50, 0.7)' as const;

const SHEET_BACKGROUND_STYLE = {
  top: 12,
  backgroundColor: colorPalette.white,
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
} as const;

const HANDLE_CONTAINER_STYLE = {
  alignItems: 'center',
  paddingTop: 2,
  paddingBottom: 8,
} as const;

const HANDLE_INDICATOR_STYLE = {
  width: 50,
  height: 3,
  borderRadius: 5,
  backgroundColor: colorPalette.sheetLine,
} as const;

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
}

function computeTitleOpacity(scrollOffset: number): number {
  if (scrollOffset <= 120) return 0;
  if (scrollOffset >= 140) return 1;
  return (scrollOffset - 120) / 20;
}

function renderBackdrop(backdropProps: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...backdropProps}
      pressBehavior="close"
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      style={[backdropProps.style, { backgroundColor: BACKDROP_COLOR }]}
      opacity={1}
    />
  );
}

function SheetBackground({ style }: BottomSheetBackgroundProps) {
  return <View pointerEvents="none" style={[style, SHEET_BACKGROUND_STYLE]} />;
}

function SheetHandle(_: BottomSheetHandleProps) {
  return (
    <View style={HANDLE_CONTAINER_STYLE}>
      <View style={HANDLE_INDICATOR_STYLE} />
    </View>
  );
}

function useScrollTitleOpacity() {
  const [titleOpacity, setTitleOpacity] = useState(0);
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setTitleOpacity(computeTitleOpacity(event.nativeEvent.contentOffset.y));
  }, []);
  return { titleOpacity, handleScroll };
}

export function Sheet({ children, onClose, title }: SheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { titleOpacity, handleScroll } = useScrollTitleOpacity();
  const keyboardOffset = useKeyboardVerticalOffset();

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundComponent={SheetBackground}
      handleComponent={SheetHandle}
      onClose={onClose}
    >
      <View style={FLEX_ONE}>
        <SheetScreenHeader title={title} titleOpacity={titleOpacity} />
        <KeyboardAvoidingView style={FLEX_ONE} behavior={KEYBOARD_BEHAVIOR} keyboardVerticalOffset={keyboardOffset}>
          <SheetScrollProvider value={handleScroll}>
            {children}
          </SheetScrollProvider>
        </KeyboardAvoidingView>
      </View>
    </BottomSheet>
  );
}
