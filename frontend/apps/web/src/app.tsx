import { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, CatalogScreen } from '@ion/ui';
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
import { authTranslations, GetStartedScreen, RegisterScreen } from '@ion/auth-ui';
import { splashTranslations } from '@ion/splash-ui';
import { SplashScreen } from './components/splash-screen';
import { IntroScreen } from './components/intro-screen';

const i18n = createLocalization();
registerTranslations(i18n, onboardingTranslations);
registerTranslations(i18n, authTranslations);
registerTranslations(i18n, splashTranslations);

const screens = {
  Splash: SplashScreen,
  GetStarted: IntroScreen,
  Catalog: CatalogScreen,
  NicknameReserved: NicknameReservedScreen,
};

const authScreens = {
  GetStarted: GetStartedScreen,
  Register: RegisterScreen,
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
    getFeatureFlag('darkModeEnabled').then((isDark) => {
      setColorMode(isDark ? 'dark' : 'light');
    });
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
