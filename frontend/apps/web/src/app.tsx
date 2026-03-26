import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { environmentConfig } from '@ion/config';
import { Button, CatalogScreen, ThemeProvider } from '@ion/ui';
import { ProfileSetupScreen } from '@ion/onboarding-ui';
import SplashPage from './app/page';

function OnboardingButton({ onPress }: { onPress: () => void }) {
  return (
    <button onClick={onPress} style={{ padding: '12px 24px', backgroundColor: '#0166FF', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', margin: 16 }}>
      Onboarding
    </button>
  );
}

function AppContent() {
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showAuthFlow) return <SplashPage />;

  if (showOnboarding) {
    return (
      <ProfileSetupScreen
        onContinue={() => setShowOnboarding(false)}
        onBack={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <main>
      <h1>ION ({environmentConfig.appEnvironment})</h1>
      <Button label="Auth Flow" onPress={() => setShowAuthFlow(true)} color="primary" />
      <CatalogScreen />
      <OnboardingButton onPress={() => setShowOnboarding(true)} />
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
