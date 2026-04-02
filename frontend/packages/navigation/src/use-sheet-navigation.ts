import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from './route-params';

type SheetNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useSheetNavigation() {
  return useNavigation<SheetNavigationProp>();
}
