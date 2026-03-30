import { StatusBar, View, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider, Text, colorPalette, CatalogScreen } from '@ion/ui';
import { AppNavigator } from '@ion/navigation';
import { createLocalization, registerTranslations } from '@ion/localization';
import { onboardingTranslations } from '@ion/onboarding-ui';
import { authTranslations } from '@ion/auth-ui';
import { chatTranslations } from '@ion/chat';

const i18n = createLocalization();
registerTranslations(i18n, onboardingTranslations);
registerTranslations(i18n, authTranslations);
registerTranslations(i18n, chatTranslations);

function SplashScreen() {
  return <View style={splashStyle} />;
}

function GetStartedScreen() {
  const handleLogIn = () => {
    console.log('Log In pressed');
  };

  return (
    <View style={getStartedStyles.container}>
      <Pressable onPress={handleLogIn} style={getStartedStyles.button}>
        <Text variant="subtitle">Log In</Text>
      </Pressable>
    </View>
  );
}

const screens = {
  Splash: SplashScreen,
  GetStarted: GetStartedScreen,
  Catalog: CatalogScreen,
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

const splashStyle = {
  flex: 1,
  backgroundColor: colorPalette.forest,
};

const getStartedStyles = {
  container: {
    flex: 1,
    backgroundColor: colorPalette.forest,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: colorPalette.raspberry,
    borderRadius: 12,
  },
};

export default App;
