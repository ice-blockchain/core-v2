import { environmentConfig } from '@ion/config';

export function App() {
  return (
    <main>
      <h1>ION ({environmentConfig.appEnvironment})</h1>
    </main>
  );
}
