import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { environmentConfig } from '@ion/config';
import { Button, CatalogScreen, ThemeProvider } from '@ion/ui';
import { ProfileSetupScreen, SelectLanguagesScreen } from '@ion/onboarding-ui';
import SplashPage from './app/page';

type OnboardingStep = 'profile' | 'languages';

function OnboardingButton({ onPress }: { onPress: () => void }) {
  return (
    <button onClick={onPress} style={{ padding: '12px 24px', backgroundColor: '#0166FF', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', margin: 16 }}>
      Onboarding
    </button>
  );
}

function AppContent() {
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(null);

  if (showAuthFlow) return <SplashPage />;

  if (onboardingStep === 'profile') {
    return (
      <ProfileSetupScreen
        onContinue={() => setOnboardingStep('languages')}
        onBack={() => setOnboardingStep(null)}
      />
    );
  }

  if (onboardingStep === 'languages') {
    return (
      <SelectLanguagesScreen
        onContinue={() => setOnboardingStep(null)}
        onBack={() => setOnboardingStep('profile')}
      />
    );
  }

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
