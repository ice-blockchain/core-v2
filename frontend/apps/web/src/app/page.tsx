"use client";

import { useCallback, useState } from "react";
import { SplashVideo } from "@/components/splash-video";
import { IntroVideo } from "@/components/intro-video";
import { PrimaryButton } from "@/components/primary-button";
import { BottomSheet } from "@/components/bottom-sheet";
import { GetStartedScreen } from "@/components/get-started-screen";
import { RegisterScreen } from "@/components/register-screen";
import { VerifyPasskeyScreen } from "@/components/verify-passkey-screen";

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

export default function SplashPage() {
  const nav = usePhaseNavigation();

  if (nav.phase === "splash") {
    return <SplashVideo onComplete={nav.goToIntro} />;
  }

  return (
    <>
      <IntroVideo>
        {nav.phase === "intro" ? (
          <PrimaryButton label="Log In" onClick={nav.goToGetStarted} />
        ) : null}
      </IntroVideo>
      {nav.phase !== "intro" && (
        <BottomSheet>
          <AuthSheetContent nav={nav} />
        </BottomSheet>
      )}
    </>
  );
}
