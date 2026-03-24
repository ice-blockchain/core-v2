import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SplashVideo } from "./splash-video";
import { IntroVideo } from "./intro-video";
import { PrimaryButton } from "./primary-button";
import { BottomSheet } from "./bottom-sheet";
import { GetStartedScreen } from "../screens/get-started-screen";
import { RegisterScreen } from "../screens/register-screen";
import { VerifyPasskeyScreen } from "../screens/verify-passkey-screen";

type Phase = "splash" | "intro" | "get-started" | "register" | "verify-passkey";

function usePhaseNavigation() {
  const [phase, setPhase] = useState<Phase>("splash");

  return {
    phase,
    goToIntro: useCallback(() => setPhase("intro"), []),
    goToGetStarted: useCallback(() => setPhase("get-started"), []),
    goToRegister: useCallback(() => setPhase("register"), []),
    goToVerifyPasskey: useCallback(() => setPhase("verify-passkey"), []),
  };
}

function AuthSheetContent({ nav }: { nav: ReturnType<typeof usePhaseNavigation> }) {
  if (nav.phase === "register") {
    return (
      <RegisterScreen
        onBack={nav.goToGetStarted}
        onNavigateToVerifyPasskey={nav.goToVerifyPasskey}
      />
    );
  }
  if (nav.phase === "verify-passkey") {
    return <VerifyPasskeyScreen />;
  }
  return (
    <GetStartedScreen
      onNavigateToRegister={nav.goToRegister}
      onNavigateToVerifyPasskey={nav.goToVerifyPasskey}
    />
  );
}

function AuthOverlay({ nav }: { nav: ReturnType<typeof usePhaseNavigation> }) {
  return (
    <BottomSheet>
      <AuthSheetContent nav={nav} />
    </BottomSheet>
  );
}

export function SplashScreen() {
  const nav = usePhaseNavigation();

  if (nav.phase === "splash") {
    return <SplashVideo onComplete={nav.goToIntro} />;
  }

  return (
    <View style={styles.container}>
      <IntroVideo>
        {nav.phase === "intro" ? (
          <PrimaryButton label="Log In" onPress={nav.goToGetStarted} />
        ) : null}
      </IntroVideo>
      {nav.phase !== "intro" && <AuthOverlay nav={nav} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
