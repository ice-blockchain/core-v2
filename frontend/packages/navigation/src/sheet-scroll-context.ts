import { createContext, useContext } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type ScrollHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

const SheetScrollContext = createContext<ScrollHandler | undefined>(undefined);

export const SheetScrollProvider = SheetScrollContext.Provider;

export function useSheetScroll(): ScrollHandler | undefined {
  return useContext(SheetScrollContext);
}
