import { useCallback, useEffect, useRef } from "react";
import { Image } from "react-native";
import type { MediaViewerSource } from "@ion/media-viewer";
import { SplashScreen as SplashScreenCore } from "@ion/splash-ui";
import { useAppNavigation, Routes } from "@ion/navigation";
import { Logger } from "@ion/diagnostics";
import { loadWalletViewData, initializeWalletClient } from "@ion/wallet";
import { identityClient } from "../identity-client";

const resolvedAsset = Image.resolveAssetSource(
  require("../../assets/videos/logo_static.mp4"),
);

const splashSource: MediaViewerSource = {
  uri: resolvedAsset.uri,
  mimeType: "video/mp4",
};

export function SplashScreen() {
  const navigation = useAppNavigation();
  const restoreComplete = useRef(false);
  const videoComplete = useRef(false);
  const hasNavigated = useRef(false);

  const navigateToTarget = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    const users = identityClient.authStore.getSnapshot();
    const isAuthenticated = users.length > 0;
    if (isAuthenticated) {
      initializeWalletClient(identityClient, users[0]!);
      loadWalletViewData().catch(console.error);
    }
    const target = isAuthenticated ? Routes.Main : Routes.GetStarted;
    navigation.reset({ index: 0, routes: [{ name: target }] });
  }, [navigation]);

  useEffect(() => {
    identityClient
      .restoreAuth()
      .catch((error: unknown) => {
        Logger.error('Auth restore failed', { tag: 'auth', error });
      })
      .finally(() => {
        restoreComplete.current = true;
        if (videoComplete.current) navigateToTarget();
      });
  }, [navigateToTarget]);

  const handleComplete = useCallback(() => {
    videoComplete.current = true;
    if (restoreComplete.current) navigateToTarget();
  }, [navigateToTarget]);

  return <SplashScreenCore videoSource={splashSource} onComplete={handleComplete} />;
}
