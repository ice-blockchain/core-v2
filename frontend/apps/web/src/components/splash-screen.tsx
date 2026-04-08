import { useCallback, useEffect, useRef } from "react";
import type { MediaViewerSource } from "@ion/media-viewer";
import { SplashScreen as SplashScreenCore } from "@ion/splash-ui";
import { useAppNavigation, Routes } from "@ion/navigation";
import { Logger } from "@ion/diagnostics";
import { identityClient } from "../identity-client";

const splashSource: MediaViewerSource = {
  uri: "/videos/logo_static.mp4",
  mimeType: "video/mp4",
};

function useAuthRestore(onComplete: () => void) {
  useEffect(() => {
    identityClient
      .restoreAuth()
      .catch((error: unknown) => {
        Logger.error('Auth restore failed', {
          tag: 'auth',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      })
      .finally(onComplete);
  }, [onComplete]);
}

export function SplashScreen() {
  const navigation = useAppNavigation();
  const restoreComplete = useRef(false);
  const videoComplete = useRef(false);
  const hasNavigated = useRef(false);

  const navigateToTarget = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    const isAuthenticated = identityClient.authStore.getSnapshot().length > 0;
    const target = isAuthenticated ? Routes.Main : Routes.GetStarted;
    navigation.reset({ index: 0, routes: [{ name: target }] });
  }, [navigation]);

  const handleRestoreComplete = useCallback(() => {
    restoreComplete.current = true;
    if (videoComplete.current) navigateToTarget();
  }, [navigateToTarget]);

  useAuthRestore(handleRestoreComplete);

  const handleComplete = useCallback(() => {
    videoComplete.current = true;
    if (restoreComplete.current) navigateToTarget();
  }, [navigateToTarget]);

  return <SplashScreenCore videoSource={splashSource} onComplete={handleComplete} />;
}
