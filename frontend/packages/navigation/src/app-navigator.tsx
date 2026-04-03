import { useMemo } from 'react';
import type { ComponentType } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from './route-params';
import type { AuthScreens } from './auth-sheet-navigator';
import { AuthSheetNavigator } from './auth-sheet-navigator';
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
    ChatPreview: ComponentType;
    ProxyTest?: ComponentType;
    NicknameReserved: ComponentType;
  };
  authScreens: AuthScreens;
}

export function AppNavigator({ screens, authScreens }: AppNavigatorProps) {
  const AuthScreen = useMemo(
    () => function AuthScreen() {
      return <AuthSheetNavigator screens={authScreens} />;
    },
    [authScreens],
  );

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Stack.Screen name={Routes.Splash} component={screens.Splash} />
      <Stack.Screen name={Routes.GetStarted} component={screens.GetStarted} />
      <Stack.Screen name={Routes.Catalog} component={screens.Catalog} />
      <Stack.Screen name={Routes.ChatPreview} component={screens.ChatPreview} />
      {screens.ProxyTest && (
        <Stack.Screen name={Routes.ProxyTest} component={screens.ProxyTest} />
      )}
      <Stack.Screen name={Routes.Sheet.Auth} component={AuthScreen} options={TRANSPARENT_MODAL_OPTIONS} />
      <Stack.Screen name={Routes.Sheet.NicknameReserved} component={screens.NicknameReserved} options={TRANSPARENT_MODAL_OPTIONS} />
    </Stack.Navigator>
  );
}
