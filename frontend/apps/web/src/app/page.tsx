import { environmentConfig } from '@ion/config/web';

export default function HomePage() {
  return (
    <main>
      <h1>ION ({environmentConfig.appEnvironment})</h1>
    </main>
  );
}
