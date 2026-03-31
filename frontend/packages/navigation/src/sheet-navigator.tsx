import { useRef } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import type {
  BottomSheetBackdropProps,
  BottomSheetBackgroundProps,
  BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import { colorPalette } from '@ion/ui';

const SNAP_POINTS = ['92%'];
const CONTENT_STYLE = { flex: 1 } as const;
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
  paddingBottom: 10,
  marginTop: -10,
} as const;

const HANDLE_INDICATOR_STYLE = {
  width: 50,
  height: 3,
  borderRadius: 5,
  backgroundColor: colorPalette.sheetLine,
} as const;

export interface SheetProps {
  children: ReactNode;
  onClose: () => void;
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

export function Sheet({ children, onClose }: SheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      backdropComponent={renderBackdrop}
      backgroundComponent={SheetBackground}
      handleComponent={SheetHandle}
      onClose={onClose}
    >
      <BottomSheetView style={CONTENT_STYLE}>
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}
