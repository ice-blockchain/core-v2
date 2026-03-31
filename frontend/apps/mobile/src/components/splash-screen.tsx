import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { timingConfig } from "@ion/config";
import {
  GetStartedScreen,
  PrimaryButton,
  RegisterScreen,
  VerifyPasskeyScreen,
  VerifyPasswordBackground,
  VerifyPasswordOverlay,
} from "@ion/auth-ui";
import { CatalogScreen } from "@ion/ui";
import { SplashVideo } from "./splash-video";
import { IntroVideo } from "./intro-video";
import { BottomSheet } from "./bottom-sheet";
import { IONLoader } from "@ion/ui";

type Phase =
  | { name: "splash" }
  | { name: "intro" }
  | { name: "catalog" }
  | { name: "get-started" }
  | { name: "register" }
  | { name: "verify-password"; identityKeyName: string }
  | { name: "verify-passkey"; identityKeyName: string };

function usePhaseNavigation() {
  const initialPhase: Phase = timingConfig.splashDurationMs > 0 ? { name: "splash" } : { name: "intro" };
  const [phase, setPhase] = useState<Phase>(initialPhase);

  return {
    phase,
    goToIntro: useCallback(() => setPhase({ name: "intro" }), []),
    goToGetStarted: useCallback(() => setPhase({ name: "get-started" }), []),
    goToRegister: useCallback(() => setPhase({ name: "register" }), []),
    goToVerifyPassword: useCallback(
      (identityKeyName: string) => setPhase({ name: "verify-password", identityKeyName }),
      [],
    ),
    goToVerifyPasskey: useCallback(
      (identityKeyName: string) => setPhase({ name: "verify-passkey", identityKeyName }),
      [],
    ),
    goToCatalog: useCallback(() => setPhase({ name: "catalog" }), []),
  };
}

function AuthSheetContent({ nav }: { nav: ReturnType<typeof usePhaseNavigation> }) {
  if (nav.phase.name === "register") {
    return (
      <RegisterScreen
        onBack={nav.goToGetStarted}
        onContinue={({ identityKeyName }) => nav.goToVerifyPassword(identityKeyName)}
      />
    );
  }
  if (nav.phase.name === "verify-password") {
    return (
      <VerifyPasswordBackground
        loadingElement={<IONLoader variant="light" size={30} />}
      />
    );
  }
  if (nav.phase.name === "verify-passkey") {
    return (
      <VerifyPasskeyScreen
        identityKeyName={nav.phase.identityKeyName}
        onBack={nav.goToRegister}
        onDismiss={nav.goToGetStarted}
        loadingElement={<IONLoader variant="light" size={30} />}
      />
    );
  }
  return (
    <GetStartedScreen
      onNavigateToRegister={nav.goToRegister}
      onNavigateToVerifyPassword={nav.goToVerifyPassword}
      onNavigateToRestore={nav.goToGetStarted}
    />
  );
}

function PasswordOverlay({ nav }: { nav: ReturnType<typeof usePhaseNavigation> }) {
  if (nav.phase.name !== "verify-password") return null;
  const { identityKeyName } = nav.phase;
  return <VerifyPasswordOverlay onConfirm={() => nav.goToVerifyPasskey(identityKeyName)} />;
}

export function SplashScreen() {
  const nav = usePhaseNavigation();

  if (nav.phase.name === "splash") {
    return <SplashVideo onComplete={nav.goToIntro} />;
  }

  if (nav.phase.name === "catalog") {
    return <CatalogScreen />;
  }

  return (
    <View style={styles.container}>
      <IntroVideo>
        {nav.phase.name === "intro" ? (
          <View style={styles.introButtons}>
            <PrimaryButton label="Log In" onPress={nav.goToGetStarted} />
            <PrimaryButton label="UI Catalog" onPress={nav.goToCatalog} />
          </View>
        ) : null}
      </IntroVideo>
      {nav.phase.name !== "intro" && (
        <>
          <BottomSheet>
            <AuthSheetContent nav={nav} />
          </BottomSheet>
          <PasswordOverlay nav={nav} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  introButtons: {
    gap: 12,
  },
});
