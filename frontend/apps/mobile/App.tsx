import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider, CatalogScreen } from '@ion/ui';
import { AppNavigator } from '@ion/navigation';
import { createLocalization, registerTranslations } from '@ion/localization';
import {
  ProfileSetupScreen,
  SelectLanguagesScreen,
  DiscoverCreatorsScreen,
  NotificationsScreen,
  onboardingTranslations,
} from '@ion/onboarding-ui';
import { authTranslations, GetStartedSheetScreen, RegisterSheetScreen } from '@ion/auth-ui';
import { chatTranslations } from '@ion/chat';
import { splashTranslations } from '@ion/splash-ui';
import { SplashScreen } from './src/components/splash-screen';
import { IntroScreen } from './src/components/intro-screen';

const i18n = createLocalization();
registerTranslations(i18n, onboardingTranslations);
registerTranslations(i18n, authTranslations);
registerTranslations(i18n, chatTranslations);
registerTranslations(i18n, splashTranslations);

const screens = {
  Splash: SplashScreen,
  GetStarted: IntroScreen,
  Catalog: CatalogScreen,
  'Sheet/GetStarted': GetStartedSheetScreen,
  'Sheet/Register': RegisterSheetScreen,
  'Sheet/ProfileSetup': ProfileSetupScreen,
  'Sheet/SelectLanguages': SelectLanguagesScreen,
  'Sheet/DiscoverCreators': DiscoverCreatorsScreen,
  'Sheet/Notifications': NotificationsScreen,
};

function App() {
  return (
    <GestureHandlerRootView style={rootStyle}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer>
            <BottomSheetModalProvider>
              <StatusBar barStyle="light-content" />
              <AppNavigator screens={screens} />
            </BottomSheetModalProvider>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const rootStyle = { flex: 1 };

export default App;
