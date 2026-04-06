import type { ReactNode } from "react";
import { useState, useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, useTheme } from '@ion/ui';
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
} from "@ion/onboarding-ui";
import { authTranslations, GetStartedScreen, IdentityKeyNameNoteScreen, PasswordRegisterScreen, PasskeyRegisterScreen, VerifyPasskeySheetScreen } from "@ion/auth-ui";
import { chatTranslations } from "@ion/chat";
import { splashTranslations } from "@ion/splash-ui";
import { SplashScreen } from "./src/components/splash-screen";
import { IntroScreen } from "./src/components/intro-screen";
import { CatalogScreen } from "./src/components/catalog-screen";
import { ChatPreviewScreen } from "./src/components/chat-preview-screen";
import { ProxyTestScreen } from "./src/components/proxy-test-screen";
import { StorageTestScreen } from "./src/components/storage-test-screen";

const i18n = createLocalization();
registerTranslations(i18n, onboardingTranslations);
registerTranslations(i18n, authTranslations);
registerTranslations(i18n, chatTranslations);
registerTranslations(i18n, splashTranslations);

const screens = {
  Splash: SplashScreen,
  GetStarted: IntroScreen,
  Catalog: CatalogScreen,
  ChatPreview: ChatPreviewScreen,
  NicknameReserved: NicknameReservedScreen,
  ProxyTest: ProxyTestScreen,
  IdentityKeyNameNote: IdentityKeyNameNoteScreen,
  VerifyPasskey: VerifyPasskeySheetScreen,
  StorageTest: StorageTestScreen,
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

function ThemedRoot({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.secondaryBackground }}>
      <StatusBar barStyle={theme.colorMode === "dark" ? "light-content" : "dark-content"} />
      {children}
    </View>
  );
}

function AppContent() {
  const navigationTheme = useNavigationTheme();
  return (
    <ThemedRoot>
      <NavigationContainer theme={navigationTheme}>
        <BottomSheetModalProvider>
          <AppNavigator screens={screens} authScreens={authScreens} />
        </BottomSheetModalProvider>
      </NavigationContainer>
    </ThemedRoot>
  );
}

function App() {
  const [colorMode, setColorMode] = useState<ColorMode | null>(null);

  useEffect(() => {
    getFeatureFlag('darkModeEnabled')
      .then((isDark) => { setColorMode(isDark ? 'dark' : 'light'); })
      .catch(() => { setColorMode('light'); });
  }, []);

  if (colorMode === null) return null;

  return (
    <GestureHandlerRootView style={rootStyle}>
      <SafeAreaProvider>
        <ThemeProvider colorMode={colorMode}>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const rootStyle = { flex: 1 };

export default App;
