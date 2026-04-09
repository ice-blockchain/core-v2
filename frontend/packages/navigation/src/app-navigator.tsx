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

function SheetScreens({ s, Auth, WalletView }: { s: AppNavigatorScreens; Auth: ComponentType; WalletView?: ComponentType })
  return (
    <>
      <Stack.Screen name={Routes.Sheet.Auth} component={Auth} options={MODAL} />
      {WalletView && <Stack.Screen name={Routes.Sheet.WalletViewManagement} component={WalletView} options={MODAL} />}
      <Stack.Screen name={Routes.Sheet.NicknameReserved} component={s.NicknameReserved} options={MODAL} />
      <Stack.Screen name={Routes.Sheet.IdentityKeyNameNote} component={s.IdentityKeyNameNote} options={MODAL} />
      <Stack.Screen name={Routes.Sheet.Verify} component={s.Verify} options={MODAL} />
      <Stack.Screen name={Routes.Sheet.LinkDevice} component={s.LinkDevice} options={MODAL} />
      <Stack.Screen name={Routes.Sheet.VerifyOnOtherDevice} component={s.VerifyOnOtherDevice} options={MODAL} />
      <Stack.Screen name={Routes.Sheet.AddBiometrics} component={s.AddBiometrics} options={MODAL} />
      <Stack.Screen name={Routes.Sheet.AddPasskeyCredentials} component={s.AddPasskeyCredentials} options={MODAL} />
      <Stack.Screen name={Routes.Sheet.InvalidCredentials} component={s.InvalidCredentials} options={MODAL} />
      <Stack.Screen name={Routes.Sheet.ConfirmPassword} component={s.ConfirmPassword} options={MODAL} />
      <Stack.Screen name={Routes.Sheet.RestoreSuccess} component={s.RestoreSuccess} options={MODAL} />
      <Stack.Screen name={Routes.Sheet.GeneralError} component={s.GeneralError} options={MODAL} />
      {s.CreatePost && <Stack.Screen name={Routes.Sheet.CreatePost} component={s.CreatePost} options={MODAL} />}
      {s.MediaPicker && <Stack.Screen name={Routes.Sheet.MediaPicker} component={s.MediaPicker} options={MODAL} />}
      {s.GalleryPermissionDenied && <Stack.Screen name={Routes.Sheet.GalleryPermissionDenied} component={s.GalleryPermissionDenied} options={MODAL} />}
      {s.CameraPermissionDenied && <Stack.Screen name={Routes.Sheet.CameraPermissionDenied} component={s.CameraPermissionDenied} options={MODAL} />}
      {s.CancelPost && <Stack.Screen name={Routes.Sheet.CancelPost} component={s.CancelPost} options={MODAL} />}
      {s.Settings && <Stack.Screen name={Routes.Sheet.Settings} component={s.Settings} options={MODAL} />}
    </>
  );
}

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
      <SheetScreens s={s} Auth={Auth} WalletView={WalletView} />
    </Stack.Navigator>
  );
}
