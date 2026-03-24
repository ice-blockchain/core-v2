# @ion/config

Typed environment configuration for ION mobile and web apps. Wraps `react-native-config` and validates required variables at startup.

## Install

1. Add `@ion/config` to your app:

```bash
pnpm add @ion/config
```

2. Add `react-native-config` as a **direct dependency** of the consuming app. React Native autolinking does not traverse workspace packages, so the native module must be declared at the app level:

```bash
pnpm add react-native-config
```

3. Install pods (iOS):

```bash
cd ios && bundle exec pod install
```

## Usage

```typescript
import { environmentConfig } from '@ion/config';

console.log(environmentConfig.appEnvironment); // 'staging'
console.log(environmentConfig.apiBaseUrl);      // 'https://api.staging.ion.app'
```

The config is validated on import. The app will crash at startup if any required variable is missing or invalid.
