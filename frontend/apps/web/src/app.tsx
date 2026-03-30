import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { environmentConfig } from '@ion/config';
import { Button, CatalogScreen, ThemeProvider } from '@ion/ui';
import { createLocalization, registerTranslations, translate } from '@ion/localization';
import { DiscoverCreatorsScreen, NotificationsScreen, ProfileSetupScreen, SelectLanguagesScreen, onboardingTranslations } from '@ion/onboarding-ui';
import { authTranslations } from '@ion/auth-ui';
import SplashPage from './app/page';

const i18n = createLocalization();
registerTranslations(i18n, onboardingTranslations);
registerTranslations(i18n, authTranslations);

type OnboardingStep = 'profile' | 'languages' | 'discover-creators' | 'notifications';

function OnboardingButton({ onPress }: { onPress: () => void }) {
  return (
    <button onClick={onPress} style={{ padding: '12px 24px', backgroundColor: '#0166FF', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', margin: 16 }}>
      {translate('onboarding:continueButton')}
    </button>
  );
}

const onboardingStepMap: Record<OnboardingStep, { Screen: typeof ProfileSetupScreen; next: OnboardingStep | null; prev: OnboardingStep | null }> = {
  'profile': { Screen: ProfileSetupScreen, next: 'languages', prev: null },
  'languages': { Screen: SelectLanguagesScreen, next: 'discover-creators', prev: 'profile' },
  'discover-creators': { Screen: DiscoverCreatorsScreen, next: 'notifications', prev: 'languages' },
  'notifications': { Screen: NotificationsScreen, next: null, prev: 'discover-creators' },
};

function OnboardingFlow({ step, setStep }: { step: OnboardingStep; setStep: (s: OnboardingStep | null) => void }) {
  const config = onboardingStepMap[step];
  return (
    <config.Screen
      onContinue={() => setStep(config.next)}
      onBack={() => setStep(config.prev)}
    />
  );
}

function AppContent() {
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(null);

  if (showAuthFlow) return <SplashPage />;
  if (onboardingStep) return <OnboardingFlow step={onboardingStep} setStep={setOnboardingStep} />;

  return (
    <main>
      <h1>ION ({environmentConfig.appEnvironment})</h1>
      <Button label="Auth Flow" onPress={() => setShowAuthFlow(true)} color="primary" />
      <CatalogScreen />
      <OnboardingButton onPress={() => setOnboardingStep('profile')} />
    </main>
  );
}

export function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
