import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { MediaViewerSource } from "@ion/media-viewer";

import { Icon, colorPalette } from "@ion/ui";
import { splashConfig } from "@ion/splash";

import { SplashVideo } from "./splash-video";

export interface SplashScreenProps {
  videoSource: MediaViewerSource;
  onComplete?: () => void;
}

function SplashFallback() {
  return (
    <View style={styles.fallbackContainer}>
      <Icon name="login-ice-logo" size={148} color={colorPalette.sharkText} />
    </View>
  );
}

export function SplashScreen({ videoSource, onComplete }: SplashScreenProps) {
  const hasAdvanced = useRef(false);
  const [hasError, setHasError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    if (hasAdvanced.current) return;
    hasAdvanced.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (onComplete) onComplete();
  }, [onComplete]);

  useEffect(() => {
    timerRef.current = setTimeout(advance, splashConfig.safetyTimeoutMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [advance]);

  const handleError = useCallback(() => {
    setHasError(true);
    advance();
  }, [advance]);

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
    backgroundColor: splashConfig.backgroundColor,
  },
  fallbackContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: splashConfig.backgroundColor,
  },
});
