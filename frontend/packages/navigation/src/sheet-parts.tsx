import { View } from 'react-native';
import { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps, BottomSheetBackgroundProps, BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { colorPalette } from '@ion/ui';

export const BACKDROP_COLOR = 'rgba(8, 21, 50, 0.7)' as const;

export const SHEET_BACKGROUND_STYLE = {
  top: 12,
  backgroundColor: colorPalette.white,
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
} as const;

export const HANDLE_CONTAINER_STYLE = {
  alignItems: 'center',
  paddingTop: 2,
  paddingBottom: 8,
} as const;

export const HANDLE_INDICATOR_STYLE = {
  width: 50,
  height: 3,
  borderRadius: 5,
  backgroundColor: colorPalette.sheetLine,
} as const;

export function renderBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      pressBehavior="close"
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      style={[props.style, { backgroundColor: BACKDROP_COLOR }]}
      opacity={1}
    />
  );
}

export function SheetBackground({ style }: BottomSheetBackgroundProps) {
  return <View pointerEvents="none" style={[style, SHEET_BACKGROUND_STYLE]} />;
}

export function SheetHandle(_: BottomSheetHandleProps) {
  return (
    <View style={HANDLE_CONTAINER_STYLE}>
      <View style={HANDLE_INDICATOR_STYLE} />
    </View>
  );
}
