import { useEffect } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { timingConfig } from "@ion/config";

interface SplashVideoProps {
  onComplete: () => void;
}

export function SplashVideo({ onComplete }: SplashVideoProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, timingConfig.splashDurationMs);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
