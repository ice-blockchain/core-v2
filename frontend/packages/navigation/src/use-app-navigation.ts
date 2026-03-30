import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from './route-params';

type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useAppNavigation() {
  return useNavigation<AppNavigationProp>();
}
