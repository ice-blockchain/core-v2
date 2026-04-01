import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { MediaVideo } from "@ion/media-viewer";
import type { MediaViewerSource } from "@ion/media-viewer";
import { SPLASH_BACKGROUND_COLOR } from "@ion/splash";

interface SplashVideoProps {
  source: MediaViewerSource;
  onEnd: () => void;
  onError: () => void;
}

export function SplashVideo({ source, onEnd, onError }: SplashVideoProps) {
  const handleError = useCallback(
    (error: Error) => {
      console.error("SplashVideo playback error:", error);
      onError();
    },
    [onError],
  );

  return (
    <View style={styles.container}>
      <MediaVideo
        source={source}
        autoPlay
        muted
        resizeMode="cover"
        onEnd={onEnd}
        onError={handleError}
        style={styles.video}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND_COLOR,
  },
  video: {
    width: "100%",
    height: "100%",
  },
});
