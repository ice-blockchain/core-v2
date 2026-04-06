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
    Main?: ComponentType;
    Catalog: ComponentType;
    ProxyTest?: ComponentType;
    StorageTest?: ComponentType;
    AuthFlow?: ComponentType;
    NicknameReserved: ComponentType;
    IdentityKeyNameNote: ComponentType;
    VerifyPasskey: ComponentType;
    LinkDevice: ComponentType;
    VerifyOnOtherDevice: ComponentType;
    AddPasskeyCredentials: ComponentType;
    CreatePost?: ComponentType;
  };
  authScreens: AuthScreens;
  isAuthenticated?: boolean;
}

function useAuthScreen(authScreens: AuthScreens) {
  return useMemo(
    () => function AuthScreen() {
      return <AuthSheetNavigator screens={authScreens} />;
    },
    [authScreens],
  );
}

export function AppNavigator({ screens, authScreens, isAuthenticated }: AppNavigatorProps) {
  const AuthScreen = useAuthScreen(authScreens);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name={Routes.Splash} component={screens.Splash} />
      <Stack.Screen name={Routes.GetStarted} component={screens.GetStarted} />
      {screens.Main && isAuthenticated && (
        <Stack.Screen name={Routes.Main} component={screens.Main} />
      )}
      <Stack.Screen name={Routes.Catalog} component={screens.Catalog} />
      {screens.ProxyTest && <Stack.Screen name={Routes.ProxyTest} component={screens.ProxyTest} />}
      {screens.StorageTest && <Stack.Screen name={Routes.StorageTest} component={screens.StorageTest} />}
      {screens.AuthFlow && (
        <Stack.Screen name={Routes.AuthFlow} component={screens.AuthFlow} options={TRANSPARENT_MODAL_OPTIONS} />
      )}
      <Stack.Group screenOptions={TRANSPARENT_MODAL_OPTIONS}>
        <Stack.Screen name={Routes.Sheet.Auth} component={AuthScreen} />
        <Stack.Screen name={Routes.Sheet.NicknameReserved} component={screens.NicknameReserved} />
        <Stack.Screen name={Routes.Sheet.IdentityKeyNameNote} component={screens.IdentityKeyNameNote} />
        <Stack.Screen name={Routes.Sheet.VerifyPasskey} component={screens.VerifyPasskey} />
        <Stack.Screen name={Routes.Sheet.LinkDevice} component={screens.LinkDevice} />
        <Stack.Screen name={Routes.Sheet.VerifyOnOtherDevice} component={screens.VerifyOnOtherDevice} />
        <Stack.Screen name={Routes.Sheet.AddPasskeyCredentials} component={screens.AddPasskeyCredentials} />
        {screens.CreatePost && <Stack.Screen name={Routes.Sheet.CreatePost} component={screens.CreatePost} />}
      </Stack.Group>
    </Stack.Navigator>
  );
}
