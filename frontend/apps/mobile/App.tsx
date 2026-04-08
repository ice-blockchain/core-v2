import 'react-native-get-random-values';
import 'fast-text-encoding';
import type { ReactNode } from "react";
import { useState, useEffect, useSyncExternalStore } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
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
import { authTranslations, AddBiometricsScreen, AddPasskeyCredentialsScreen, ConfirmPasswordScreen, GetStartedScreen, IdentityKeyNameNoteScreen, InvalidCredentialsModal, LinkDeviceScreen, PasswordRegisterScreen, PasskeyRegisterScreen, VerifyOnOtherDeviceScreen, VerifySheetScreen } from "@ion/auth-ui";
import { chatTranslations } from "@ion/chat";
import { walletUiTranslations } from "@ion/wallet-ui";
import { userSearchTranslations } from "@ion/user-search-ui";
import { splashTranslations } from "@ion/splash-ui";
import { mainShellTranslations } from "@ion/main-tabs-ui";
import { CreatePostSheetScreen, feedTranslations } from "@ion/feed-ui";
import { profileTranslations } from "@ion/profile-ui";
import { SplashScreen } from "./src/components/splash-screen";
import { IntroScreen } from "./src/components/intro-screen";
import { CatalogScreen } from "./src/components/catalog-screen";
import { ProxyTestScreen } from "./src/components/proxy-test-screen";
import { StorageTestScreen } from "./src/components/storage-test-screen";
import { MainScreen } from "./src/components/main-screen";
import { identityClient } from "./src/identity-client";

const i18n = createLocalization();
registerTranslations(i18n, onboardingTranslations);
registerTranslations(i18n, authTranslations);
registerTranslations(i18n, chatTranslations);
registerTranslations(i18n, splashTranslations);
registerTranslations(i18n, mainShellTranslations);
registerTranslations(i18n, feedTranslations);
registerTranslations(i18n, walletUiTranslations);
registerTranslations(i18n, userSearchTranslations);
registerTranslations(i18n, profileTranslations);

const screens = {
  Splash: SplashScreen,
  GetStarted: IntroScreen,
  Main: MainScreen,
  Catalog: CatalogScreen,
  NicknameReserved: NicknameReservedScreen,
  ProxyTest: ProxyTestScreen,
  IdentityKeyNameNote: IdentityKeyNameNoteScreen,
  Verify: VerifySheetScreen,
  StorageTest: StorageTestScreen,
  VerifyOnOtherDevice: VerifyOnOtherDeviceScreen,
  AddBiometrics: AddBiometricsScreen,
  AddPasskeyCredentials: AddPasskeyCredentialsScreen,
  CreatePost: CreatePostSheetScreen,
  LinkDevice: LinkDeviceScreen,
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

function ThemedRoot({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[themedRootStyles.container, { backgroundColor: theme.colors.secondaryBackground }]}>
      <StatusBar barStyle={theme.colorMode === "dark" ? "light-content" : "dark-content"} />
      {children}
    </View>
  );
}

function AppContent() {
  const navigationTheme = useNavigationTheme();
  const users = useSyncExternalStore(identityClient.authStore.subscribe, identityClient.authStore.getSnapshot);
  const isAuthenticated = users.length > 0;

  return (
    <ThemedRoot>
      <NavigationContainer theme={navigationTheme}>
        <BottomSheetModalProvider>
          <AppNavigator screens={screens} authScreens={authScreens} isAuthenticated={isAuthenticated} />
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
const themedRootStyles = StyleSheet.create({ container: { flex: 1 } });

export default App;
