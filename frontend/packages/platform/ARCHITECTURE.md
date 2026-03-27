# @ion/platform Architecture

Cross-platform abstraction for native device and runtime capabilities. Provides a unified API for device info, identity, app lifecycle, screen dimensions, safe area, keyboard, and install referrer.

## Public API

```typescript
// Device
export { getDeviceInfo }        // OS, model, app version, build number
export { getUserAgent }         // Standardized UA string
export { getDeviceId }          // Persistent device identifier

// Install attribution
export { getInstallReferrer }   // Marketing referrer data

// App lifecycle
export { getCurrentAppState }   // Sync: 'active' | 'inactive' | 'background'
export { onAppStateChange }     // Subscribe to state changes

// Screen
export { getScreenDimensions }  // Width, height, pixel scale
export { getSafeAreaInsets }    // Notch/home indicator insets
export { setSafeAreaInsets }    // Set insets (called by native code)

// Keyboard
export { getKeyboardHeight, isKeyboardVisible, onKeyboardChange, hideKeyboard }

// Types
export type {
  Platform, DeviceInfo, InstallReferrer,
  AppLifecycleState, AppLifecycleListener,
  ScreenDimensions, SafeAreaInsets,
  KeyboardChangeEvent, KeyboardChangeListener,
}
```

## Platform Resolution

| Module | Native | Web |
|--------|--------|-----|
| `device-info` | `react-native-device-info` | Browser UA parsing |
| `device-identity` | iOS: Keychain, Android: AsyncStorage + AndroidId | localStorage + generated UUID |
| `install-referrer` | Android NativeModules | URL query params (`ref`, `utm_source`) |
| `app-lifecycle` | RN `AppState` | `document.visibilitychange` |
| `screen-dimensions` | RN `Dimensions` | `window.innerWidth/Height` |
| `keyboard` | RN `Keyboard` listeners | `visualViewport` API |

## Design Decisions

- **Cache + promise deduplication**: All async functions cache results and deduplicate pending promises to prevent race conditions.
- **Event subscriptions return unsubscribe**: `const unsub = onAppStateChange(cb); unsub();`
- **Safe area platform differences**: Android enforces 12px minimum bottom inset. Web returns zeros (CSS `env()` handles it).
- **Device identity persistence**: iOS uses Keychain with compare-and-swap. Android falls back from native AndroidId to AsyncStorage UUID.
- **No internal deps**: Only imports from React Native ecosystem on native, browser APIs on web.

## Dependencies

- **Downstream**: None (foundation layer)
- **Peer deps**: `react-native`, `react-native-device-info`, `react-native-keychain`, `@react-native-async-storage/async-storage` (all optional)
- **Upstream consumers**: `@ion/ui` (scaling), `@ion/network`, `@ion/permissions`, app shells

## File Structure

```
src/
  index.ts
  types.ts
  device-info.{ts,web.ts}
  device-identity.{ts,web.ts}
  device-identity-ios.ts
  device-identity-android.ts
  generate-uuid.ts
  user-agent.ts
  install-referrer.{ts,web.ts}
  app-lifecycle.{ts,web.ts}
  screen-dimensions.{ts,web.ts}
  keyboard.{ts,web.ts}
  *.test.ts
```
