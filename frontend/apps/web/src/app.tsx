import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider, colorPalette, CatalogScreen } from '@ion/ui';
import { AppNavigator, useAppNavigation, Routes } from '@ion/navigation';
import { createLocalization, registerTranslations } from '@ion/localization';
import {
  ProfileSetupScreen,
  SelectLanguagesScreen,
  DiscoverCreatorsScreen,
  NotificationsScreen,
  onboardingTranslations,
} from '@ion/onboarding-ui';
import { authTranslations } from '@ion/auth-ui';
import { SplashScreen } from './components/splash-screen';
import { IntroScreen } from './components/intro-screen';

const i18n = createLocalization();
registerTranslations(i18n, onboardingTranslations);
registerTranslations(i18n, authTranslations);

const screens = {
  Splash: SplashScreen,
  GetStarted: IntroScreen,
  Catalog: CatalogScreen,
  'Sheet/ProfileSetup': ProfileSetupScreen,
  'Sheet/SelectLanguages': SelectLanguagesScreen,
  'Sheet/DiscoverCreators': DiscoverCreatorsScreen,
  'Sheet/Notifications': NotificationsScreen,
};

export function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer>
            <BottomSheetModalProvider>
              <AppNavigator screens={screens} />
            </BottomSheetModalProvider>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
