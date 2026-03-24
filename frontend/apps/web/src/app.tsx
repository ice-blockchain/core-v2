import { environmentConfig } from '@ion/config/web';

export function App() {
  return (
    <main>
      <h1>ION ({environmentConfig.appEnvironment})</h1>
    </main>
  );
}
