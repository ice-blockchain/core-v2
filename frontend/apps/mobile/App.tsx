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
import { AppNavigator, useNavigationTheme, BottomSheetModalProvider, GeneralErrorScreen, navigationTranslations } from '@ion/navigation';
import { AuthActionsProvider, createAuthFlowStore, setAuthFlowStore } from '@ion/auth';
import { createLocalization, registerTranslations } from '@ion/localization';
import {
  ProfileSetupScreen,
  SelectLanguagesScreen,
  DiscoverCreatorsScreen,
  NotificationsScreen,
  NicknameReservedScreen,
  onboardingTranslations,
} from "@ion/onboarding-ui";
import { authTranslations, AddBiometricsScreen, AddPasskeyCredentialsScreen, ConfirmPasswordScreen, GetStartedScreen, IdentityKeyNameNoteScreen, InvalidCredentialsModal, LinkDeviceScreen, PasswordRegisterScreen, PasskeyRegisterScreen, RestoreCloudScreen, RestoreIdentityScreen, RestoreSetNewPasswordScreen, RestoreSuccessScreen, RestoreWithRecoveryCredsScreen, TfaOptionsScreen, TfaVerificationScreen, VerifyOnOtherDeviceScreen, VerifySheetScreen } from "@ion/auth-ui";
import { chatTranslations } from "@ion/chat";
import { loadWalletViewData, initializeWalletClient, resetWalletClient } from "@ion/wallet";
import { walletUiTranslations, WalletViewSwitcherScreen, ManageWalletViewsScreen, CreateWalletViewScreen, EditWalletViewScreen, DeleteWalletViewConfirmScreen, showWalletError } from "@ion/wallet-ui";
import { userSearchTranslations } from "@ion/user-search-ui";
import { splashTranslations } from "@ion/splash-ui";
import { mainShellTranslations } from "@ion/main-tabs-ui";
import { CreatePostSheetScreen, MediaPickerSheetScreen, GalleryPermissionDeniedScreen, CameraPermissionDeniedScreen, CancelPostScreen, feedTranslations } from "@ion/feed-ui";
import { profileTranslations, SettingsSheetScreen } from "@ion/profile-ui";
import { HomeScreen, homeTranslations } from "@ion/home-ui";
import { SplashScreen } from "./src/components/splash-screen";
import { IntroScreen } from "./src/components/intro-screen";
import { CatalogScreen } from "./src/components/catalog-screen";
import { ProxyTestScreen } from "./src/components/proxy-test-screen";
import { StorageTestScreen } from "./src/components/storage-test-screen";
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
registerTranslations(i18n, homeTranslations);
registerTranslations(i18n, navigationTranslations);

const screens = {
  Splash: SplashScreen,
  GetStarted: IntroScreen,
  Main: HomeScreen,
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
  MediaPicker: MediaPickerSheetScreen,

  GalleryPermissionDenied: GalleryPermissionDeniedScreen,
  CameraPermissionDenied: CameraPermissionDeniedScreen,
  CancelPost: CancelPostScreen,
  LinkDevice: LinkDeviceScreen,
  InvalidCredentials: InvalidCredentialsModal,
  ConfirmPassword: ConfirmPasswordScreen,
  RestoreSuccess: RestoreSuccessScreen,
  GeneralError: GeneralErrorScreen,
  walletViewScreens: {
    Switcher: WalletViewSwitcherScreen,
    Manage: ManageWalletViewsScreen,
    Create: CreateWalletViewScreen,
    Edit: EditWalletViewScreen,
    DeleteConfirm: DeleteWalletViewConfirmScreen,
  },
  Settings: SettingsSheetScreen,
};

const authScreens = {
  GetStarted: GetStartedScreen,
  PasswordRegister: PasswordRegisterScreen,
  PasskeyRegister: PasskeyRegisterScreen,
  RestoreIdentity: RestoreIdentityScreen,
  RestoreFromCloud: RestoreCloudScreen,
  RestoreWithRecoveryCreds: RestoreWithRecoveryCredsScreen,
  TfaOptions: TfaOptionsScreen,
  TfaVerification: TfaVerificationScreen,
  RestoreSetNewPassword: RestoreSetNewPasswordScreen,
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

const handleAuthSuccess = (username: string) => {
  resetWalletClient();
  initializeWalletClient(identityClient, username);
  loadWalletViewData().catch(showWalletError);
};
const authFlowStore = createAuthFlowStore({ identityClient, onAuthSuccess: handleAuthSuccess });
setAuthFlowStore(authFlowStore);

function AppContent() {
  const navigationTheme = useNavigationTheme();
  const users = useSyncExternalStore(identityClient.authStore.subscribe, identityClient.authStore.getSnapshot);
  const isAuthenticated = users.length > 0;

  return (
    <ThemedRoot>
      <NavigationContainer theme={navigationTheme}>
        <BottomSheetModalProvider>
          <AuthActionsProvider store={authFlowStore} onAuthSuccess={handleAuthSuccess}>
            <AppNavigator screens={screens} authScreens={authScreens} isAuthenticated={isAuthenticated} />
          </AuthActionsProvider>
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
