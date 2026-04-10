# ION Mobile

React Native app for the ION social + crypto platform.

## Requirements

- Node 22+
- pnpm 9+
- Xcode (iOS) or Android Studio (Android)
- For iOS: Ruby + CocoaPods

## Setup

From the monorepo root:

```bash
pnpm install
```

First-time iOS native setup:

```bash
pnpm install
pnpm pods
```

`pnpm pods` runs a guarded CocoaPods workflow that checks Ruby gems and retries with a spec repo update when needed. For consistent results, make sure your active Ruby matches `apps/mobile/.tool-versions`.

## Dev

```bash
# Start Metro bundler
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android
```

## Commands

```bash
pnpm start      # Metro bundler
pnpm ios        # react-native run-ios
pnpm android    # react-native run-android
pnpm lint       # ESLint
pnpm test       # Jest
```

## Native builds

Native project files (`android/`, `ios/`) are committed to the repo. After updating native dependencies, re-run CocoaPods:

```bash
pnpm pods
```

You can also build directly from Xcode or Android Studio.
