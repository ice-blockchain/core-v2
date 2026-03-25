import { useState } from 'react';
import { environmentConfig } from '@ion/config';
import { Button, CatalogScreen } from '@ion/ui';
import SplashPage from './app/page';

export function App() {
  const [showAuthFlow, setShowAuthFlow] = useState(false);

  if (showAuthFlow) return <SplashPage />;

  return (
    <main>
      <h1>ION ({environmentConfig.appEnvironment})</h1>
      <Button label="Auth Flow" onPress={() => setShowAuthFlow(true)} color="primary" />
      <CatalogScreen />
    </main>
  );
}
