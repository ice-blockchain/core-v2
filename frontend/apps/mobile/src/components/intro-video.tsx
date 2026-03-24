import { useCallback, type ReactNode } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Video, { type OnVideoErrorData } from "react-native-video";

interface IntroVideoProps {
  children: ReactNode;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const introSource = require("../../assets/videos/intro.mp4");

export function IntroVideo({ children }: IntroVideoProps) {
  const handleError = useCallback((error: OnVideoErrorData) => {
    console.error("IntroVideo playback error:", error);
  }, []);

  return (
    <View style={styles.container}>
      <Video
        source={introSource}
        style={styles.video}
        resizeMode="cover"
        muted
        repeat
        onError={handleError}
      />
      <View style={styles.overlay}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
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
