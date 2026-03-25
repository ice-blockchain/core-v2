"use client";

import { useCallback, useState } from "react";
import {
  GetStartedScreen,
  PrimaryButton,
  RegisterScreen,
  VerifyPasskeyScreen,
  VerifyPasswordBackground,
  VerifyPasswordOverlay,
} from "@ion/auth-ui";
import { SplashVideo } from "@/components/splash-video";
import { IntroVideo } from "@/components/intro-video";
import { BottomSheet } from "@/components/bottom-sheet";
import { LoadingAnimation } from "@/components/loading-animation";

type Phase =
  | { name: "splash" }
  | { name: "intro" }
  | { name: "get-started" }
  | { name: "register" }
  | { name: "verify-password"; identityKeyName: string }
  | { name: "verify-passkey"; identityKeyName: string };

function usePhaseNavigation() {
  const [phase, setPhase] = useState<Phase>({ name: "splash" });

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
  };
}

function AuthSheetContent({ nav }: { nav: ReturnType<typeof usePhaseNavigation> }) {
  const loadingElement = <LoadingAnimation variant="onLightBackground" size={30} />;

  if (nav.phase.name === "register") {
    return (
      <RegisterScreen
        onBack={nav.goToGetStarted}
        onContinue={({ identityKeyName }) => nav.goToVerifyPassword(identityKeyName)}
      />
    );
  }
  if (nav.phase.name === "verify-password") {
    return <VerifyPasswordBackground loadingElement={loadingElement} />;
  }
  if (nav.phase.name === "verify-passkey") {
    return (
      <VerifyPasskeyScreen
        identityKeyName={nav.phase.identityKeyName}
        onBack={nav.goToRegister}
        onDismiss={nav.goToGetStarted}
        loadingElement={loadingElement}
      />
    );
  }
  return (
    <GetStartedScreen
      onNavigateToRegister={nav.goToRegister}
      onNavigateToVerifyPasskey={nav.goToVerifyPassword}
    />
  );
}

function PasswordOverlay({ nav }: { nav: ReturnType<typeof usePhaseNavigation> }) {
  if (nav.phase.name !== "verify-password") return null;
  const { identityKeyName } = nav.phase;
  return <VerifyPasswordOverlay onConfirm={() => nav.goToVerifyPasskey(identityKeyName)} />;
}

export default function SplashPage() {
  const nav = usePhaseNavigation();

  if (nav.phase.name === "splash") {
    return <SplashVideo onComplete={nav.goToIntro} />;
  }

  return (
    <>
      <IntroVideo>
        {nav.phase.name === "intro" ? (
          <PrimaryButton label="Log In" onPress={nav.goToGetStarted} />
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
    </>
  );
}
