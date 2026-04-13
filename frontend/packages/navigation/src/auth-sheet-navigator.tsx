import type { ComponentType } from 'react';
import { useCallback, useRef, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EventArg } from '@react-navigation/native';
import { translate } from '@ion/localization';

import type { AuthStackParamList } from './route-params';
import { Routes } from './routes';
import { Sheet } from './sheet-navigator';
import { useSheetNavigation } from './use-sheet-navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const SCREEN_OPTIONS = {
  headerShown: false as const,
  animation: 'slide_from_right' as const,
  contentStyle: { backgroundColor: 'transparent' as const },
};

export interface AuthScreens {
  GetStarted: ComponentType;
  PasswordRegister: ComponentType;
  PasskeyRegister: ComponentType;
  RestoreIdentity: ComponentType;
  RestoreFromCloud: ComponentType;
  RestoreWithRecoveryCreds: ComponentType;
  TfaOptions: ComponentType;
  TfaVerification: ComponentType;
  RestoreSetNewPassword: ComponentType;
  ProfileSetup: ComponentType;
  SelectLanguages: ComponentType;
  DiscoverCreators: ComponentType;
  Notifications: ComponentType;
}

const TITLE_KEYS: Record<string, string> = {
  [Routes.Auth.GetStarted]: 'auth:getStartedTitle',
  [Routes.Auth.PasswordRegister]: 'auth:registerTitle',
  [Routes.Auth.PasskeyRegister]: 'auth:passkeyRegisterTitle',
  [Routes.Auth.RestoreIdentity]: 'auth:restoreMenuTitle',
  [Routes.Auth.RestoreFromCloud]: 'auth:restoreMenuTitle',
  [Routes.Auth.RestoreWithRecoveryCreds]: 'auth:restoreMenuTitle',
  [Routes.Auth.TfaOptions]: 'auth:tfaVerificationTitle',
  [Routes.Auth.TfaVerification]: 'auth:tfaVerificationTitle',
  [Routes.Auth.RestoreSetNewPassword]: 'auth:setNewPasswordTitle',
  [Routes.Auth.ProfileSetup]: 'onboarding:yourProfileTitle',
  [Routes.Auth.SelectLanguages]: 'onboarding:selectLanguagesTitle',
  [Routes.Auth.DiscoverCreators]: 'onboarding:discoverCreatorsTitle',
  [Routes.Auth.Notifications]: 'onboarding:notificationsTitle',
};

function translateTitle(routeName: string): string {
  const key = TITLE_KEYS[routeName];
  return key ? translate(key) : '';
}

type AuthNavigation = Pick<NativeStackNavigationProp<AuthStackParamList>, 'goBack' | 'canGoBack'>;
type AuthNavRef = React.MutableRefObject<AuthNavigation | null>;

type StateEvent = EventArg<'state', false, { state: { index: number; routes: Array<{ name: string }> } }>;

function useAuthScreenListeners(navRef: AuthNavRef, setTitle: (title: string) => void) {
  return useCallback(({ navigation }: { navigation: AuthNavigation }) => {
    navRef.current = navigation;
    return {
      state: (event: StateEvent) => {
        const navState = event.data?.state;
        const focusedRoute = navState?.routes[navState.index];
        if (!focusedRoute) return;
        setTitle(translateTitle(focusedRoute.name));
      },
    };
  }, [navRef, setTitle]);
}

function AuthStack({ screens, navRef, setTitle }: { screens: AuthScreens; navRef: AuthNavRef; setTitle: (t: string) => void }) {
  const screenListeners = useAuthScreenListeners(navRef, setTitle);

  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS} screenListeners={screenListeners}>
      <Stack.Screen name={Routes.Auth.GetStarted} component={screens.GetStarted} />
      <Stack.Screen name={Routes.Auth.PasswordRegister} component={screens.PasswordRegister} />
      <Stack.Screen name={Routes.Auth.PasskeyRegister} component={screens.PasskeyRegister} />
      <Stack.Screen name={Routes.Auth.RestoreIdentity} component={screens.RestoreIdentity} />
      <Stack.Screen name={Routes.Auth.RestoreFromCloud} component={screens.RestoreFromCloud} />
      <Stack.Screen name={Routes.Auth.RestoreWithRecoveryCreds} component={screens.RestoreWithRecoveryCreds} />
      <Stack.Screen name={Routes.Auth.TfaOptions} component={screens.TfaOptions} />
      <Stack.Screen name={Routes.Auth.TfaVerification} component={screens.TfaVerification} />
      <Stack.Screen name={Routes.Auth.RestoreSetNewPassword} component={screens.RestoreSetNewPassword} />
      <Stack.Screen name={Routes.Auth.ProfileSetup} component={screens.ProfileSetup} />
      <Stack.Screen name={Routes.Auth.SelectLanguages} component={screens.SelectLanguages} />
      <Stack.Screen name={Routes.Auth.DiscoverCreators} component={screens.DiscoverCreators} />
      <Stack.Screen name={Routes.Auth.Notifications} component={screens.Notifications} />
    </Stack.Navigator>
  );
}

export function AuthSheetNavigator({ screens }: { screens: AuthScreens }) {
  const navigation = useSheetNavigation();
  const authNavRef = useRef<AuthNavigation | null>(null);
  const [title, setTitle] = useState(() => translateTitle(Routes.Auth.GetStarted));
  const handleClose = useCallback(() => navigation.goBack(), [navigation]);

  const handleBack = useCallback(() => {
    const authNav = authNavRef.current;
    if (authNav?.canGoBack()) {
      authNav.goBack();
    }
  }, []);

  return (
    <Sheet onClose={handleClose} title={title} onBack={handleBack}>
      <AuthStack screens={screens} navRef={authNavRef} setTitle={setTitle} />
    </Sheet>
  );
}
