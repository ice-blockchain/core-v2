# @ion/platform — Implementation Plan

## Purpose

Foundation-layer package providing device identity, platform metadata, install attribution, and OS-level runtime utilities. Every layer above Foundation can import this package.

---

## Modules

### 1. Device Identity (`device-identity`)

Persistent device identifier that survives app reinstalls where the platform allows it.

**Behavior by platform:**

| Platform | Primary Strategy | Fallback |
|---|---|---|
| Android | Native Android ID (`Settings.Secure.ANDROID_ID`) | Generate UUID v7, persist in SharedPreferences |
| iOS | UUID v7 stored in Keychain (non-empty account name prevents cleanup on reinstall) |  — |
| Web | UUID v7 stored in localStorage | Regenerate on clear |

**Public API:**

```typescript
getDeviceId(): Promise<string>
```

- Returns cached value after first call (singleton, in-memory cache).
- Native module bridge required for Android ID and iOS Keychain access.

**Consumers:** push subscription registration (device ID as discriminator tag), analytics, API request headers.

---

### 2. Device Info (`device-info`)

Static device and app metadata collected once at startup.

**Data shape:**

```typescript
interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  osVersion: string;          // e.g. "17.2", "33" (Android SDK level), browser UA
  deviceModel: string;        // e.g. "iPhone14,2", "SM-G991B", "Chrome 120"
  appVersion: string;         // e.g. "1.2.0"
  buildNumber: string;        // e.g. "42"
}
```

**Platform-specific retrieval:**

| Field | iOS | Android | Web |
|---|---|---|---|
| `platform` | `'ios'` | `'android'` | `'web'` |
| `osVersion` | `systemVersion` from utsname | SDK int as string | `navigator.userAgent` parsed |
| `deviceModel` | `machine` from utsname | `Build.MODEL` | Browser name + version |
| `appVersion` | `CFBundleShortVersionString` | `PackageInfo.versionName` | Env or build constant |
| `buildNumber` | `CFBundleVersion` | `PackageInfo.versionCode` | Env or build constant |

**Public API:**

```typescript
getDeviceInfo(): Promise<DeviceInfo>
```

- Cached after first call.
- Uses `react-native-device-info` on native, browser APIs on web.

---

### 3. User Agent (`user-agent`)

Constructed from device info for network request headers.

**Format:**

```
{Platform}/{OsVersion} {AppName}/{AppVersion}.{BuildNumber}
```

Example: `iOS/17.2 ion/1.2.0.42`, `Android/33 ion/1.2.0.42`

**Public API:**

```typescript
getUserAgent(): Promise<string>
```

- Built once from `getDeviceInfo()`, cached.
- Consumed by `@ion/network` for `User-Agent` header injection.

---

### 4. Install Referrer (`install-referrer`)

Attribution tracking for install source and referral codes.

**Behavior by platform:**

| Platform | Strategy |
|---|---|
| Android | Read Google Play install referrer string, parse `sender_id` param |
| iOS | No native referrer API — attribution handled by deep link service (AppsFlyer or equivalent) |
| Web | Parse `?ref=` or UTM query params from landing URL |

**Public API:**

```typescript
interface InstallReferrer {
  senderId: string | null;
  rawReferrer: string | null;
}

getInstallReferrer(): Promise<InstallReferrer>
```

- Returns `null` fields on platforms without referrer support.
- Read once, cached. Consumed during onboarding to pre-fill referral field.

**First install detection** is NOT this module's job — auth state (presence of stored identities) determines first-vs-returning user. This module only provides the referrer string if available.

---

### 5. App Lifecycle (`app-lifecycle`)

Observable app state: foreground, background, inactive.

**States:**

```typescript
type AppLifecycleState =
  | 'active'      // App is in foreground, receiving events
  | 'inactive'    // App is transitioning (e.g., system dialog, multitask switcher)
  | 'background'  // App is not visible
```

**Public API:**

```typescript
getCurrentAppState(): AppLifecycleState;

onAppStateChange(callback: (state: AppLifecycleState) => void): () => void;
// Returns unsubscribe function
```

**Known consumers and their patterns:**

| Consumer | On Background | On Active |
|---|---|---|
| Feed/wallet sync | Pause sync | Resume sync |
| Event backfill | Cancel pending pagination | Restart |
| Internet status check | Pause (avoid false disconnects) | Resume |
| Periodic heartbeats | Pause timer, remember remaining time | Resume with remaining time then restore cadence |
| Video playback | Pause | Resume only if route is still on top |
| Database maintenance | Run WAL checkpoint on transition to background | — |

**Implementation:** React Native `AppState` API on native, `visibilitychange` event on web.

---

### 6. Screen Dimensions (`screen-dimensions`)

Screen size, safe area insets, and responsive scaling utilities.

**Data shape:**

```typescript
interface ScreenDimensions {
  width: number;
  height: number;
  scale: number;              // Device pixel ratio
}

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}
```

**Public API:**

```typescript
getScreenDimensions(): ScreenDimensions;
getSafeAreaInsets(): SafeAreaInsets;
```

**Notes:**
- Safe area insets differ between full-screen pages (use `viewPadding` — system UI that doesn't shrink the view) and modals/sheets (use `padding` — safe area that shrinks the view).
- Android needs extra bottom padding (~12px) for navigation bar compensation beyond system-reported insets.
- Design reference: 375x812 (standard mobile).

---

### 7. Keyboard (`keyboard`)

Keyboard visibility and height tracking.

**Public API:**

```typescript
getKeyboardHeight(): number;
isKeyboardVisible(): boolean;
onKeyboardChange(callback: (event: KeyboardEvent) => void): () => void;

interface KeyboardEvent {
  isVisible: boolean;
  height: number;   // Logical pixels, 0 when hidden
}

hideKeyboard(): void;
```

**Known consumers and their patterns:**

| Consumer | Behavior |
|---|---|
| Chat input bar | Toggle between attachment menu and text input |
| Story viewer | Adjust bottom padding of controls panel (keyboard height + safe area) |
| Comment input | Scroll input into view with 300ms animation delay + 150px scroll padding |
| In-app notifications | Position above keyboard: `basePadding + keyboardHeight` |
| Form modals | Scroll to show focused input above keyboard |

**Implementation:**
- Native: React Native `Keyboard` API (`keyboardDidShow`, `keyboardDidHide` events).
- Web: `visualViewport` resize events, calculate height as `window.innerHeight - visualViewport.height`.
- Keyboard height must be in logical pixels (physical pixels / device pixel ratio).

---

## File Structure

```
packages/platform/
  src/
    device-identity.ts              # Stub
    device-identity.native.ts       # Android ID / iOS Keychain via native module
    device-identity.web.ts          # localStorage UUID

    device-info.ts                  # Stub
    device-info.native.ts           # react-native-device-info bridge
    device-info.web.ts              # navigator/UA parsing

    user-agent.ts                   # Pure function, no platform split needed

    install-referrer.ts             # Stub
    install-referrer.native.ts      # Play referrer (Android) / no-op (iOS)
    install-referrer.web.ts         # URL query param parsing

    app-lifecycle.ts                # Stub
    app-lifecycle.native.ts         # React Native AppState
    app-lifecycle.web.ts            # document.visibilitychange

    screen-dimensions.ts            # Stub
    screen-dimensions.native.ts     # React Native Dimensions + SafeAreaView
    screen-dimensions.web.ts        # window.innerWidth/Height + CSS env()

    keyboard.ts                     # Stub
    keyboard.native.ts              # React Native Keyboard API
    keyboard.web.ts                 # visualViewport API

    types.ts                        # All shared types

    device-identity.test.ts
    device-info.test.ts
    user-agent.test.ts
    install-referrer.test.ts
    app-lifecycle.test.ts
    screen-dimensions.test.ts
    keyboard.test.ts

  index.ts                          # Public API (native default)
  index.web.ts                      # Web variant
  package.json
  tsconfig.json
```

---

## Dependencies

| Dependency | Purpose | Platform |
|---|---|---|
| `react-native-device-info` | OS version, device model, app version | Native |
| `@react-native-async-storage/async-storage` | Android device ID fallback persistence | Native |
| `react-native-keychain` | iOS device ID persistence (survives reinstall) | Native (iOS) |
| `react-native-android-play-install-referrer` (or equivalent) | Google Play install referrer | Native (Android) |

Foundation packages (`@ion/storage`, `@ion/diagnostics`) may be used for persistence and logging where appropriate. No upward dependencies.

---

## Public API Surface (index.ts)

```typescript
// Device identity
export { getDeviceId } from './src/device-identity';

// Device info
export { getDeviceInfo } from './src/device-info';
export type { DeviceInfo } from './src/types';

// User agent
export { getUserAgent } from './src/user-agent';

// Install referrer
export { getInstallReferrer } from './src/install-referrer';
export type { InstallReferrer } from './src/types';

// App lifecycle
export { getCurrentAppState, onAppStateChange } from './src/app-lifecycle';
export type { AppLifecycleState } from './src/types';

// Screen
export { getScreenDimensions, getSafeAreaInsets } from './src/screen-dimensions';
export type { ScreenDimensions, SafeAreaInsets } from './src/types';

// Keyboard
export { getKeyboardHeight, isKeyboardVisible, onKeyboardChange, hideKeyboard } from './src/keyboard';
export type { KeyboardEvent } from './src/types';
```

---

## Implementation Order

1. **types.ts** — all interfaces and type definitions
2. **device-info** — fewest dependencies, needed by user-agent
3. **user-agent** — pure function on top of device-info
4. **device-identity** — requires native module bridge, independent
5. **app-lifecycle** — standalone, high consumer count
6. **keyboard** — standalone, many UI consumers
7. **screen-dimensions** — standalone, used for layout
8. **install-referrer** — lowest priority, only needed during onboarding

Each module gets its test file immediately after implementation (same PR).

---

## Edge Cases & Notes

- **Device ID rotation:** Android ID can change on factory reset. iOS Keychain survives reinstall only if `kSecAttrAccessibleAfterFirstUnlock` is set with a non-empty account. Document this behavior — consumers should treat device ID as "best effort persistent."
- **Keyboard height on Android:** Reports physical pixels in some RN versions. Always normalize to logical pixels.
- **Safe area on Android:** Status bar + navigation bar insets differ from iOS notch insets. The module must normalize both into the same `SafeAreaInsets` shape.
- **App lifecycle on web:** Only `active` and `background` are meaningful (`visibilitychange`). `inactive` maps to nothing — return `active` when document is visible.
- **Install referrer timing:** Google Play referrer is only available for a limited time after install. Must be read early (during app init) and cached.
- **Pauseable periodic tasks:** Consumers that run periodic work (sync, heartbeat) need the ability to pause on background and resume with the remaining interval — not restart the full interval. This is a consumer pattern, not a platform concern, but lifecycle events must fire reliably to support it.
