"use client";

import type { AppLifecycleState, AppLifecycleListener, AppStateProvider } from "./types";

export function getCurrentAppState(): AppLifecycleState {
  return document.visibilityState === "visible" ? "active" : "background";
}

export function onAppStateChange(callback: AppLifecycleListener): () => void {
  const handler = () => {
    callback(getCurrentAppState());
  };

  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}

export function createAppStateProvider(): AppStateProvider {
  return {
    getCurrentState: getCurrentAppState,
    onStateChange: (handler) => onAppStateChange(handler),
  };
}
