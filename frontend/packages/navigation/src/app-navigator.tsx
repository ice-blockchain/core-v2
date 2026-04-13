import { useMemo } from 'react';
import type { ComponentType } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from './route-params';
import type { AuthScreens } from './auth-sheet-navigator';
import { AuthSheetNavigator } from './auth-sheet-navigator';
import type { WalletViewScreens } from './wallet-view-sheet-navigator';
import { WalletViewSheetNavigator } from './wallet-view-sheet-navigator';
import { Routes } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

const MODAL = { headerShown: false as const, presentation: 'transparentModal' as const, animation: 'none' as const };
const NAV = { headerShown: false, animation: 'fade' } as const;

interface AppNavigatorScreens {
  Splash: ComponentType;
  GetStarted: ComponentType;
  Main?: ComponentType;
  Catalog: ComponentType;
  ProxyTest?: ComponentType;
  StorageTest?: ComponentType;
  AuthFlow?: ComponentType;
  NicknameReserved: ComponentType;
  IdentityKeyNameNote: ComponentType;
  Verify: ComponentType;
  LinkDevice: ComponentType;
  VerifyOnOtherDevice: ComponentType;
  AddBiometrics: ComponentType;
  AddPasskeyCredentials: ComponentType;
  InvalidCredentials: ComponentType;
  ConfirmPassword: ComponentType;
  RestoreSuccess: ComponentType;
  GeneralError: ComponentType;
  CreatePost?: ComponentType;
  MediaPicker?: ComponentType;
  GalleryPermissionDenied?: ComponentType;
  CameraPermissionDenied?: ComponentType;
  CancelPost?: ComponentType;
  EditProfile?: ComponentType;
  walletViewScreens?: WalletViewScreens;
  Settings?: ComponentType;
}

interface AppNavigatorProps {
  screens: AppNavigatorScreens;
  authScreens: AuthScreens;
  // TODO: restore isAuthenticated usage before release
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

function useWalletViewScreen(walletViewScreens?: WalletViewScreens) {
  return useMemo(
    () => walletViewScreens
      ? function WalletViewManagementScreen() { return <WalletViewSheetNavigator screens={walletViewScreens} />; }
      : undefined,
    [walletViewScreens],
  );
}

// eslint-disable-next-line max-lines-per-function -- declarative screen registration, can't extract (React Navigation requires direct children)
export function AppNavigator({ screens: s, authScreens, isAuthenticated: _isAuthenticated }: AppNavigatorProps) {
  const Auth = useAuthScreen(authScreens);
  const WalletView = useWalletViewScreen(s.walletViewScreens);
  return (
    <Stack.Navigator screenOptions={NAV}>
      <Stack.Screen name={Routes.Splash} component={s.Splash} />
      <Stack.Screen name={Routes.GetStarted} component={s.GetStarted} />
      {s.Main && <Stack.Screen name={Routes.Main} component={s.Main} />}
      <Stack.Screen name={Routes.Catalog} component={s.Catalog} />
      {s.ProxyTest && <Stack.Screen name={Routes.ProxyTest} component={s.ProxyTest} />}
      {s.StorageTest && <Stack.Screen name={Routes.StorageTest} component={s.StorageTest} />}
      {s.AuthFlow && <Stack.Screen name={Routes.AuthFlow} component={s.AuthFlow} options={MODAL} />}
      {s.EditProfile && <Stack.Screen name={Routes.EditProfile} component={s.EditProfile} options={{ animation: 'default' }} />}
      <Stack.Group screenOptions={MODAL}>
        <Stack.Screen name={Routes.Sheet.Auth} component={Auth} />
        {WalletView && <Stack.Screen name={Routes.Sheet.WalletViewManagement} component={WalletView} />}
        <Stack.Screen name={Routes.Sheet.NicknameReserved} component={s.NicknameReserved} />
        <Stack.Screen name={Routes.Sheet.IdentityKeyNameNote} component={s.IdentityKeyNameNote} />
        <Stack.Screen name={Routes.Sheet.Verify} component={s.Verify} />
        <Stack.Screen name={Routes.Sheet.LinkDevice} component={s.LinkDevice} />
        <Stack.Screen name={Routes.Sheet.VerifyOnOtherDevice} component={s.VerifyOnOtherDevice} />
        <Stack.Screen name={Routes.Sheet.AddBiometrics} component={s.AddBiometrics} />
        <Stack.Screen name={Routes.Sheet.AddPasskeyCredentials} component={s.AddPasskeyCredentials} />
        <Stack.Screen name={Routes.Sheet.InvalidCredentials} component={s.InvalidCredentials} />
        <Stack.Screen name={Routes.Sheet.ConfirmPassword} component={s.ConfirmPassword} />
        <Stack.Screen name={Routes.Sheet.RestoreSuccess} component={s.RestoreSuccess} />
        <Stack.Screen name={Routes.Sheet.GeneralError} component={s.GeneralError} />
        {s.CreatePost && <Stack.Screen name={Routes.Sheet.CreatePost} component={s.CreatePost} />}
        {s.MediaPicker && <Stack.Screen name={Routes.Sheet.MediaPicker} component={s.MediaPicker} />}
        {s.GalleryPermissionDenied && <Stack.Screen name={Routes.Sheet.GalleryPermissionDenied} component={s.GalleryPermissionDenied} />}
        {s.CameraPermissionDenied && <Stack.Screen name={Routes.Sheet.CameraPermissionDenied} component={s.CameraPermissionDenied} />}
        {s.CancelPost && <Stack.Screen name={Routes.Sheet.CancelPost} component={s.CancelPost} />}
        {s.Settings && <Stack.Screen name={Routes.Sheet.Settings} component={s.Settings} />}
      </Stack.Group>
    </Stack.Navigator>
  );
}
