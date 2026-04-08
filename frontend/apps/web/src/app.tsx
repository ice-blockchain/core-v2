import { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '@ion/ui';
import type { ColorMode } from '@ion/ui';
import { getFeatureFlag } from '@ion/config';
import { AppNavigator, useNavigationTheme, BottomSheetModalProvider } from '@ion/navigation';
import { createLocalization, registerTranslations } from '@ion/localization';
import {
  ProfileSetupScreen,
  SelectLanguagesScreen,
  DiscoverCreatorsScreen,
  NotificationsScreen,
  NicknameReservedScreen,
  onboardingTranslations,
} from '@ion/onboarding-ui';
import { authTranslations, AddBiometricsScreen, AddPasskeyCredentialsScreen, ConfirmPasswordScreen, GetStartedScreen, InvalidCredentialsModal, LinkDeviceScreen, PasswordRegisterScreen, PasskeyRegisterScreen, VerifyOnOtherDeviceScreen, VerifySheetScreen, IdentityKeyNameNoteScreen } from '@ion/auth-ui';
import { splashTranslations } from '@ion/splash-ui';
import { chatTranslations } from '@ion/chat';
import { SplashScreen } from './components/splash-screen';
import { IntroScreen } from './components/intro-screen';
import { CatalogScreen } from './components/catalog-screen';

const i18n = createLocalization();
registerTranslations(i18n, onboardingTranslations);
registerTranslations(i18n, authTranslations);
registerTranslations(i18n, splashTranslations);
registerTranslations(i18n, chatTranslations);

const screens = {
  Splash: SplashScreen,
  GetStarted: IntroScreen,
  Main: CatalogScreen,
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
};

const authScreens = {
  GetStarted: GetStartedScreen,
  PasswordRegister: PasswordRegisterScreen,
  PasskeyRegister: PasskeyRegisterScreen,
  ProfileSetup: ProfileSetupScreen,
  SelectLanguages: SelectLanguagesScreen,
  DiscoverCreators: DiscoverCreatorsScreen,
  Notifications: NotificationsScreen,
};

function AppContent() {
  const navigationTheme = useNavigationTheme();
  return (
    <NavigationContainer theme={navigationTheme}>
      <BottomSheetModalProvider>
        <AppNavigator screens={screens} authScreens={authScreens} />
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
