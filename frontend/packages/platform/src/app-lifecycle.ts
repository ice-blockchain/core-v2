import { AppState } from "react-native";
import type { AppLifecycleState, AppLifecycleListener, AppStateProvider } from "./types";

function mapNativeState(nativeState: string): AppLifecycleState {
  if (nativeState === "active") return "active";
  if (nativeState === "inactive") return "inactive";
  return "background";
}

export function getCurrentAppState(): AppLifecycleState {
  return mapNativeState(AppState.currentState);
}

export function onAppStateChange(callback: AppLifecycleListener): () => void {
  const subscription = AppState.addEventListener("change", (nextState) => {
    callback(mapNativeState(nextState));
  });

  return () => subscription.remove();
}

export function createAppStateProvider(): AppStateProvider {
  return {
    getCurrentState: getCurrentAppState,
    onStateChange: (handler) => onAppStateChange(handler),
  };
}
