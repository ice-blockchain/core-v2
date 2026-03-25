import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SplashVideo } from "./splash-video";
import { IntroVideo } from "./intro-video";
import { PrimaryButton } from "./primary-button";
import { BottomSheet } from "./bottom-sheet";
import { GetStartedScreen } from "../screens/get-started-screen";
import { RegisterScreen } from "../screens/register-screen";
import { VerifyPasskeyScreen } from "../screens/verify-passkey-screen";

type Phase =
  | { name: "splash" }
  | { name: "intro" }
  | { name: "get-started" }
  | { name: "register" }
  | { name: "verify-passkey"; identityKeyName: string };

function usePhaseNavigation() {
  const [phase, setPhase] = useState<Phase>({ name: "splash" });

  return {
    phase,
    goToIntro: useCallback(() => setPhase({ name: "intro" }), []),
    goToGetStarted: useCallback(() => setPhase({ name: "get-started" }), []),
    goToRegister: useCallback(() => setPhase({ name: "register" }), []),
    goToVerifyPasskey: useCallback(
      (identityKeyName: string) => setPhase({ name: "verify-passkey", identityKeyName }),
      [],
    ),
  };
}

function AuthSheetContent({ nav }: { nav: ReturnType<typeof usePhaseNavigation> }) {
  if (nav.phase.name === "register") {
    return (
      <RegisterScreen
        onBack={nav.goToGetStarted}
        onNavigateToVerifyPasskey={nav.goToVerifyPasskey}
      />
    );
  }
  if (nav.phase.name === "verify-passkey") {
    return (
      <VerifyPasskeyScreen
        identityKeyName={nav.phase.identityKeyName}
        onBack={nav.goToRegister}
        onDismiss={nav.goToGetStarted}
      />
    );
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

  if (nav.phase.name === "splash") {
    return <SplashVideo onComplete={nav.goToIntro} />;
  }

  return (
    <View style={styles.container}>
      <IntroVideo>
        {nav.phase.name === "intro" ? (
          <PrimaryButton label="Log In" onPress={nav.goToGetStarted} />
        ) : null}
      </IntroVideo>
      {nav.phase.name !== "intro" && <AuthOverlay nav={nav} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
