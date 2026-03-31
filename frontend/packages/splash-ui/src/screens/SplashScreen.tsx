import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { MediaViewerSource } from "@ion/media-viewer";

import { Icon, colorPalette } from "@ion/ui";
import { useAppNavigation, Routes } from "@ion/navigation";
import { SAFETY_TIMEOUT_MS, SPLASH_BACKGROUND_COLOR } from "@ion/splash";

import { SplashVideo } from "./splash-video";

export interface SplashScreenProps {
  videoSource: MediaViewerSource;
}

function SplashFallback() {
  return (
    <View style={styles.container}>
      <Icon name="login-ice-logo" size={148} color={colorPalette.sharkText} />
    </View>
  );
}

export function SplashScreen({ videoSource }: SplashScreenProps) {
  const navigation = useAppNavigation();
  const hasAdvanced = useRef(false);
  const [hasError, setHasError] = useState(false);

  const advance = useCallback(() => {
    if (hasAdvanced.current) return;
    hasAdvanced.current = true;
    navigation.reset({ index: 0, routes: [{ name: Routes.Sheet.ProfileSetup }] });
  }, [navigation]);

  useEffect(() => {
    const timer = setTimeout(advance, SAFETY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [advance]);

  const handleError = useCallback(() => setHasError(true), []);

  if (hasError) return <SplashFallback />;

  return (
    <View style={styles.container}>
      <SplashVideo source={videoSource} onEnd={advance} onError={handleError} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SPLASH_BACKGROUND_COLOR,
  },
});
