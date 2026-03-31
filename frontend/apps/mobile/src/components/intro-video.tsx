import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import { MediaVideo } from "@ion/media-viewer";
import type { MediaViewerSource } from "@ion/media-viewer";

interface IntroVideoProps {
  children: ReactNode;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("screen");

const resolvedAsset = Image.resolveAssetSource(
  require("../../assets/videos/intro.mp4"),
);

const introSource: MediaViewerSource = {
  uri: resolvedAsset.uri,
  mimeType: "video/mp4",
};

export function IntroVideo({ children }: IntroVideoProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = useCallback(() => setIsLoaded(true), []);

  const handleError = useCallback((error: Error) => {
    console.error("IntroVideo playback error:", error);
    setHasError(true);
  }, []);

  const containerStyle = useMemo(
    () => [styles.container, !isLoaded && styles.containerPreload],
    [isLoaded],
  );

  return (
    <View style={containerStyle}>
      {!hasError && (
        <MediaVideo
          source={introSource}
          autoPlay
          muted
          isLooping
          resizeMode="cover"
          style={styles.video}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      <View style={styles.overlay}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  containerPreload: {
    backgroundColor: "#FFFFFF",
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 76,
  },
});
