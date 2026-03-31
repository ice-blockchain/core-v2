import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@ion/ui';
import { createLocalization, registerTranslations } from '@ion/localization';
import { onboardingTranslations } from '@ion/onboarding-ui';
import { authTranslations } from '@ion/auth-ui';
import SplashPage from './app/page';

const i18n = createLocalization();
registerTranslations(i18n, onboardingTranslations);
registerTranslations(i18n, authTranslations);

export function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SplashPage />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
