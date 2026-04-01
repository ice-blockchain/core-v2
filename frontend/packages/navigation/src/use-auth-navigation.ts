import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AuthStackParamList } from './route-params';

type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export function useAuthNavigation() {
  return useNavigation<AuthNavigationProp>();
}
