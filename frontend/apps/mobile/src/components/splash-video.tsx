import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Video from "react-native-video";

interface SplashVideoProps {
  onComplete: () => void;
}

const SAFETY_TIMEOUT_MS = 2000;

const splashSource = require("../../assets/videos/logo_static.mp4");

export function SplashVideo({ onComplete }: SplashVideoProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(onComplete, SAFETY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleError = useCallback(() => {
    setHasError(true);
    onComplete();
  }, [onComplete]);

  if (hasError) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <Video
        source={splashSource}
        style={styles.video}
        resizeMode="contain"
        muted
        repeat={false}
        onEnd={onComplete}
        onError={handleError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  video: {
    width: "100%",
    height: "100%",
  },
});
