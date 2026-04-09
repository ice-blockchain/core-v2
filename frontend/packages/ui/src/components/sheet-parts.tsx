import { useMemo } from 'react';
import { View } from 'react-native';
import { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps, BottomSheetBackgroundProps, BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { useTheme } from '../theme/ThemeProvider';

const HANDLE_CONTAINER_STYLE = {
  alignItems: 'center',
  paddingTop: 2,
  paddingBottom: 8,
} as const;

type SheetBackdropPressBehavior = 'none' | 'close' | 'collapse';

export function SheetBackdrop({ pressBehavior = 'close', ...props }: BottomSheetBackdropProps & { pressBehavior?: SheetBackdropPressBehavior }) {
  const theme = useTheme();
  return (
    <BottomSheetBackdrop
      {...props}
      pressBehavior={pressBehavior}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      style={[props.style, { backgroundColor: theme.colors.backgroundSheet }]}
      opacity={1}
    />
  );
}

export function SheetBackground({ style }: BottomSheetBackgroundProps) {
  const theme = useTheme();
  const backgroundStyle = useMemo(() => ({
    top: 12,
    backgroundColor: theme.colors.secondaryBackground,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  }), [theme.colors.secondaryBackground]);

  return <View pointerEvents="none" style={[style, backgroundStyle]} />;
}

export function SheetHandle(_: BottomSheetHandleProps) {
  const theme = useTheme();
  const indicatorStyle = useMemo(() => ({
    width: 50,
    height: 3,
    borderRadius: 5,
    backgroundColor: theme.colors.sheetLine,
  }), [theme.colors.sheetLine]);

  return (
    <View style={HANDLE_CONTAINER_STYLE}>
      <View style={indicatorStyle} />
    </View>
  );
}
