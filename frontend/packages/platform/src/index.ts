// Device info
export { getDeviceInfo } from "./device-info";
export type { DeviceInfo, Platform } from "./types";

// User agent
export { getUserAgent } from "./user-agent";

// Device identity
export { getDeviceId } from "./device-identity";

// Install referrer
export { getInstallReferrer } from "./install-referrer";
export type { InstallReferrer } from "./types";

// App lifecycle
export { getCurrentAppState, onAppStateChange, createAppStateProvider } from "./app-lifecycle";
export type { AppLifecycleState, AppLifecycleListener, AppStateProvider } from "./types";

// Screen dimensions
export {
  getScreenDimensions,
  getSafeAreaInsets,
  setSafeAreaInsets,
} from "./screen-dimensions";
export type { ScreenDimensions, SafeAreaInsets } from "./types";

// Keyboard
export {
  getKeyboardHeight,
  isKeyboardVisible,
  onKeyboardChange,
  hideKeyboard,
} from "./keyboard";
export type { KeyboardChangeEvent, KeyboardChangeListener } from "./types";
