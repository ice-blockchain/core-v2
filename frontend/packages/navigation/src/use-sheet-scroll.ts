import { useContext } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import SheetScrollContext from './sheet-scroll-context';

type ScrollHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

export function useSheetScroll(): ScrollHandler | undefined {
  return useContext(SheetScrollContext);
}
