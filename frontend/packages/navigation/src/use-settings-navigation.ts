import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SettingsStackParamList } from './route-params';

type SettingsNavigationProp = NativeStackNavigationProp<SettingsStackParamList>;

export function useSettingsNavigation() {
  return useNavigation<SettingsNavigationProp>();
}
