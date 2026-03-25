import { environmentConfig } from '@ion/config';
import { CatalogScreen } from '@ion/ui';

export function App() {
  return (
    <main>
      <h1>ION ({environmentConfig.appEnvironment})</h1>
      <CatalogScreen />
    </main>
  );
}
