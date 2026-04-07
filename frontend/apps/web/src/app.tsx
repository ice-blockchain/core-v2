import { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '@ion/ui';
import type { ColorMode } from '@ion/ui';
import { getFeatureFlag } from '@ion/config';
import { AppNavigator, useNavigationTheme, BottomSheetModalProvider, GeneralErrorScreen, navigationTranslations } from '@ion/navigation';
import { createLocalization, registerTranslations } from '@ion/localization';
import { AuthActionsProvider, createAuthFlowStore, setAuthFlowStore } from '@ion/auth';
import {
  ProfileSetupScreen,
  SelectLanguagesScreen,
  DiscoverCreatorsScreen,
  NotificationsScreen,
  NicknameReservedScreen,
  onboardingTranslations,
} from '@ion/onboarding-ui';
import { authTranslations, AddBiometricsScreen, AddPasskeyCredentialsScreen, ConfirmPasswordScreen, GetStartedScreen, InvalidCredentialsModal, LinkDeviceScreen, PasswordRegisterScreen, PasskeyRegisterScreen, RestoreIdentityScreen, RestoreSetNewPasswordScreen, RestoreSuccessScreen, RestoreWithRecoveryCredsScreen, VerifyOnOtherDeviceScreen, VerifySheetScreen, IdentityKeyNameNoteScreen } from '@ion/auth-ui';
import { splashTranslations } from '@ion/splash-ui';
import { chatTranslations } from '@ion/chat';
import { mainShellTranslations } from '@ion/main-tabs-ui';
import { feedTranslations } from '@ion/feed-ui';
import { walletUiTranslations } from '@ion/wallet-ui';
import { profileTranslations } from '@ion/profile-ui';
import { HomeScreen, homeTranslations } from '@ion/home-ui';
import { SplashScreen } from './components/splash-screen';
import { IntroScreen } from './components/intro-screen';
import { CatalogScreen } from './components/catalog-screen';
import { identityClient } from './identity-client';

const i18n = createLocalization();
registerTranslations(i18n, onboardingTranslations);
registerTranslations(i18n, authTranslations);
registerTranslations(i18n, splashTranslations);
registerTranslations(i18n, chatTranslations);
registerTranslations(i18n, mainShellTranslations);
registerTranslations(i18n, feedTranslations);
registerTranslations(i18n, walletUiTranslations);
registerTranslations(i18n, profileTranslations);
registerTranslations(i18n, homeTranslations);
registerTranslations(i18n, navigationTranslations);

const screens = {
  Splash: SplashScreen,
  GetStarted: IntroScreen,
  Main: HomeScreen,
  Catalog: CatalogScreen,
  LinkDevice: LinkDeviceScreen,
  NicknameReserved: NicknameReservedScreen,
  Verify: VerifySheetScreen,
  IdentityKeyNameNote: IdentityKeyNameNoteScreen,
  VerifyOnOtherDevice: VerifyOnOtherDeviceScreen,
  AddBiometrics: AddBiometricsScreen,
  AddPasskeyCredentials: AddPasskeyCredentialsScreen,
  InvalidCredentials: InvalidCredentialsModal,
  ConfirmPassword: ConfirmPasswordScreen,
  RestoreSuccess: RestoreSuccessScreen,
  GeneralError: GeneralErrorScreen,
};

const authScreens = {
  GetStarted: GetStartedScreen,
  PasswordRegister: PasswordRegisterScreen,
  PasskeyRegister: PasskeyRegisterScreen,
  RestoreIdentity: RestoreIdentityScreen,
  RestoreWithRecoveryCreds: RestoreWithRecoveryCredsScreen,
  RestoreSetNewPassword: RestoreSetNewPasswordScreen,
  ProfileSetup: ProfileSetupScreen,
  SelectLanguages: SelectLanguagesScreen,
  DiscoverCreators: DiscoverCreatorsScreen,
  Notifications: NotificationsScreen,
};

const authFlowStore = createAuthFlowStore({ identityClient, onAuthSuccess: () => {} });
setAuthFlowStore(authFlowStore);

function AppContent() {
  const navigationTheme = useNavigationTheme();

  return (
    <NavigationContainer theme={navigationTheme}>
      <BottomSheetModalProvider>
        <AuthActionsProvider store={authFlowStore} onAuthSuccess={() => {}}>
          <AppNavigator screens={screens} authScreens={authScreens} />
        </AuthActionsProvider>
      </BottomSheetModalProvider>
    </NavigationContainer>
  );
}

export function App() {
  const [colorMode, setColorMode] = useState<ColorMode | null>(null);

  useEffect(() => {
    getFeatureFlag('darkModeEnabled')
      .then((isDark) => { setColorMode(isDark ? 'dark' : 'light'); })
      .catch(() => { setColorMode('light'); });
  }, []);

  if (colorMode === null) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider colorMode={colorMode}>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
