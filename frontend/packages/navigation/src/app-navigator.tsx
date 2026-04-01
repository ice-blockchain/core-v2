import type { ComponentType } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from './route-params';
import { Routes } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

const TRANSPARENT_MODAL_OPTIONS = {
  headerShown: false as const,
  presentation: 'transparentModal' as const,
  animation: 'none' as const,
};

interface AppNavigatorProps {
  screens: {
    Splash: ComponentType;
    GetStarted: ComponentType;
    Catalog: ComponentType;
    'Sheet/GetStarted': ComponentType;
    'Sheet/Register': ComponentType;
    'Sheet/ProfileSetup': ComponentType;
    'Sheet/SelectLanguages': ComponentType;
    'Sheet/DiscoverCreators': ComponentType;
    'Sheet/Notifications': ComponentType;
  };
}

export function AppNavigator({ screens }: AppNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Stack.Screen name={Routes.Splash} component={screens.Splash} />
      <Stack.Screen
        name={Routes.GetStarted}
        component={screens.GetStarted}
      />
      <Stack.Screen name={Routes.Catalog} component={screens.Catalog} />
      <Stack.Screen name={Routes.Sheet.GetStarted} component={screens['Sheet/GetStarted']} options={TRANSPARENT_MODAL_OPTIONS} />
      <Stack.Screen name={Routes.Sheet.Register} component={screens['Sheet/Register']} options={TRANSPARENT_MODAL_OPTIONS} />
      <Stack.Screen name={Routes.Sheet.ProfileSetup} component={screens['Sheet/ProfileSetup']} options={TRANSPARENT_MODAL_OPTIONS} />
      <Stack.Screen name={Routes.Sheet.SelectLanguages} component={screens['Sheet/SelectLanguages']} options={TRANSPARENT_MODAL_OPTIONS} />
      <Stack.Screen name={Routes.Sheet.DiscoverCreators} component={screens['Sheet/DiscoverCreators']} options={TRANSPARENT_MODAL_OPTIONS} />
      <Stack.Screen name={Routes.Sheet.Notifications} component={screens['Sheet/Notifications']} options={TRANSPARENT_MODAL_OPTIONS} />
    </Stack.Navigator>
  );
}
