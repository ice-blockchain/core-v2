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
    ChatPreview: ComponentType;
    ProxyTest?: ComponentType;
    StorageTest?: ComponentType;
    NicknameReserved: ComponentType;
    IdentityKeyNameNote: ComponentType;
    VerifyPasskey: ComponentType;
    LinkDevice: ComponentType;
    VerifyOnOtherDevice: ComponentType;
    AddPasskeyCredentials: ComponentType;
    CreatePost?: ComponentType;
  };
  authScreens: AuthScreens;
}

function useAuthScreen(authScreens: AuthScreens) {
  return useMemo(
    () => function AuthScreen() {
      return <AuthSheetNavigator screens={authScreens} />;
    },
    [authScreens],
  );
}

function AppScreens({ screens, AuthScreen }: { screens: AppNavigatorProps['screens']; AuthScreen: ComponentType }) {
  return (
    <>
      <Stack.Screen name={Routes.Splash} component={screens.Splash} />
      <Stack.Screen name={Routes.GetStarted} component={screens.GetStarted} />
      {screens.Main && <Stack.Screen name={Routes.Main} component={screens.Main} />}
      <Stack.Screen name={Routes.Catalog} component={screens.Catalog} />
      <Stack.Screen name={Routes.ChatPreview} component={screens.ChatPreview} />
      {screens.ProxyTest && <Stack.Screen name={Routes.ProxyTest} component={screens.ProxyTest} />}
      {screens.StorageTest && <Stack.Screen name={Routes.StorageTest} component={screens.StorageTest} />}
      <Stack.Screen name={Routes.Sheet.Auth} component={AuthScreen} options={TRANSPARENT_MODAL_OPTIONS} />
      <Stack.Screen name={Routes.Sheet.NicknameReserved} component={screens.NicknameReserved} options={TRANSPARENT_MODAL_OPTIONS} />
      <Stack.Screen name={Routes.Sheet.IdentityKeyNameNote} component={screens.IdentityKeyNameNote} options={TRANSPARENT_MODAL_OPTIONS} />
      <Stack.Screen name={Routes.Sheet.VerifyPasskey} component={screens.VerifyPasskey} options={TRANSPARENT_MODAL_OPTIONS} />
      <Stack.Screen name={Routes.Sheet.LinkDevice} component={screens.LinkDevice} options={TRANSPARENT_MODAL_OPTIONS} />
      <Stack.Screen name={Routes.Sheet.VerifyOnOtherDevice} component={screens.VerifyOnOtherDevice} options={TRANSPARENT_MODAL_OPTIONS} />
      <Stack.Screen name={Routes.Sheet.AddPasskeyCredentials} component={screens.AddPasskeyCredentials} options={TRANSPARENT_MODAL_OPTIONS} />
      {screens.CreatePost && <Stack.Screen name={Routes.Sheet.CreatePost} component={screens.CreatePost} options={TRANSPARENT_MODAL_OPTIONS} />}
    </>
  );
}

export function AppNavigator({ screens, authScreens }: AppNavigatorProps) {
  const AuthScreen = useAuthScreen(authScreens);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <AppScreens screens={screens} AuthScreen={AuthScreen} />
    </Stack.Navigator>
  );
}
