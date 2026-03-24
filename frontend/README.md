# ion-app

ION mobile-first social + crypto platform — pnpm monorepo for the React Native app, Next.js web app, and shared packages.

## Structure

```
apps/
  mobile/              React Native 0.84 (bare, New Architecture + Hermes)
  web/                 Next.js 15 (App Router)
packages/
  config/              @ion/config — environment configuration (Foundation layer)
  ui/                  Shared React/RN component primitives
  media-acquisition/   Picker, camera, metadata (stub)
scripts/
  setup-env.sh         Copies environment-specific config from .secrets/
```

## Requirements

- Node 20+
- pnpm 10+
- Ruby (for CocoaPods / fastlane)
- Xcode 26+ (iOS)
- Android Studio (Android)

## Setup

```bash
pnpm install
```

## Environment Configuration

The project supports three environments: **staging**, **testnet**, and **production**.

All environment-specific values (bundle IDs, API URLs, signing keys, Google Services configs) live in a `.secrets/` folder at the repo root. This is a clone of the private `core-v2-secrets` repo (gitignored).

| Environment | Mobile Bundle ID     | App Name     |
|-------------|---------------------|--------------|
| staging     | io.ion.app.staging  | ION Staging  |
| testnet     | io.ion.app.testnet  | ION Testnet  |
| production  | io.ion.app          | ION          |

### Setting up an environment

```bash
./scripts/setup-env.sh staging    # or testnet, production
```

On first run, the script prompts for the secrets repo URL and clones it into `.secrets/`. On subsequent runs, it pulls the latest changes automatically.

This copies:
- `.env` (runtime vars bundled via `react-native-config` / Next.js auto-load)
- `.env.secrets` (build-time only, sourced into shell — never bundled)
- Android signing keystore + key.properties
- Google Services configs, sentry properties, fastlane keys
- iOS xcconfig files and Xcode schemes

### `.secrets/` folder layout

`.secrets/` is a clone of `core-v2-secrets`. The script reads from `.secrets/frontend/`:

```
.secrets/frontend/
  shared/mobile/
    .env.secrets                           Build-time secrets (Match credentials)
    android/key.properties                 Android signing config
    android/app/ion-key.keystore           Android signing keystore
    ios/xcconfig/                          Per-env xcconfig files (bundle ID, app name)
    ios/mobile.xcodeproj/.../xcschemes/    Xcode schemes
  staging/
    mobile/.env                            Runtime vars
    mobile/android/app/google-services.json
    mobile/sentry.properties
    mobile/fastlane/keys/                  App Store Connect, Firebase, Google Play keys
    web/.env
  testnet/   ...same structure...
  production/...same structure...
```

### Variable classification

| File           | Read by                              | In app binary? | Examples                            |
|----------------|--------------------------------------|----------------|-------------------------------------|
| `.env`         | `react-native-config` / Next.js      | Yes            | APP_ENV, API_BASE_URL, RELAY_URL    |
| `.env.secrets` | Shell (`source`) — build tooling     | No             | SENTRY_AUTH_TOKEN, MATCH_GIT_URL, MATCH_GIT_BASIC_AUTHORIZATION, MATCH_PASSWORD |

## Dev

```bash
# All apps in parallel
pnpm dev

# Individual
cd apps/web && pnpm dev          # http://localhost:3000
cd apps/mobile && pnpm start     # Metro bundler
```

## Other commands

```bash
pnpm build          # Build all apps
pnpm type-check     # TypeScript across all packages
pnpm lint           # ESLint across all packages
pnpm format         # Prettier
```

## Mobile builds

One command sets up the environment and runs the app:

```bash
# iOS
pnpm ios:staging
pnpm ios:testnet
pnpm ios:production

# Android
pnpm android:staging
pnpm android:testnet
pnpm android:production
```

These run `setup-env.sh` first, then the corresponding `react-native run-ios --scheme` or `run-android --variant` command. Also available from `apps/mobile/` via `pnpm ios:staging` etc.

iOS uses 6 build configurations (Debug/Release x Staging/Testnet/Production) with xcconfig files that set `PRODUCT_BUNDLE_IDENTIFIER` and `PRODUCT_NAME` per environment.

Android uses product flavors defined in `build.gradle` with per-flavor `applicationId` and `resValue` app names.

### iOS certificates (fastlane match)

Provisioning profiles and distribution certs are managed by fastlane match. Certs repo and credentials are configured via `.env.secrets` (`MATCH_GIT_URL`, `MATCH_GIT_BASIC_AUTHORIZATION`, `MATCH_PASSWORD`). See [apps/mobile/fastlane/Matchfile](apps/mobile/fastlane/Matchfile).

```bash
# Install certs and profiles (read-only — for local dev and CI)
cd apps/mobile && bundle exec fastlane fetch_certs

# Renew and push updated certs and profiles
cd apps/mobile && bundle exec fastlane update_certs
```
