// --- Device Info ---

export type Platform = "ios" | "android" | "web";

export interface DeviceInfo {
  platform: Platform;
  osVersion: string;
  deviceModel: string;
  appVersion: string;
  buildNumber: string;
}

// --- Install Referrer ---

export interface InstallReferrer {
  senderId: string | null;
  rawReferrer: string | null;
}

// --- App Lifecycle ---

export type AppLifecycleState = "active" | "inactive" | "background";

export type AppLifecycleListener = (state: AppLifecycleState) => void;

// --- Screen Dimensions ---

export interface ScreenDimensions {
  width: number;
  height: number;
  scale: number;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// --- Keyboard ---

export interface KeyboardChangeEvent {
  isVisible: boolean;
  height: number;
}

export type KeyboardChangeListener = (event: KeyboardChangeEvent) => void;
