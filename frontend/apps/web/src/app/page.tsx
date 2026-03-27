"use client";

import { useCallback, useState } from "react";
import {
  GetStartedScreen,
  IdentityKeyNotFoundModal,
  PrimaryButton,
  RegisterScreen,
  RestoreCredentialsScreen,
  RestoreMenuScreen,
  RestoreSuccessModal,
  SetNewPasswordScreen,
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
  | { name: "restore-menu" }
  | { name: "restore-credentials" }
  | { name: "set-new-password"; identityKeyName: string }
  | { name: "verify-password"; identityKeyName: string }
  | { name: "verify-passkey"; identityKeyName: string };

function usePhaseNavigation() {
  const [phase, setPhase] = useState<Phase>({ name: "splash" });
  const [keyNotFound, setKeyNotFound] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  return {
    phase,
    keyNotFound,
    restoreSuccess,
    goToIntro: useCallback(() => setPhase({ name: "intro" }), []),
    goToGetStarted: useCallback(() => setPhase({ name: "get-started" }), []),
    goToRegister: useCallback(() => setPhase({ name: "register" }), []),
    goToVerifyPassword: useCallback(
      (identityKeyName: string) => setPhase({ name: "verify-password", identityKeyName }),
      [],
    ),
    goToRestoreMenu: useCallback(() => setPhase({ name: "restore-menu" }), []),
    goToRestoreCredentials: useCallback(() => setPhase({ name: "restore-credentials" }), []),
    goToSetNewPassword: useCallback(
      (identityKeyName: string) => {
        setRestoreSuccess(null);
        setPhase({ name: "set-new-password", identityKeyName });
      },
      [],
    ),
    goToVerifyPasskey: useCallback(
      (identityKeyName: string) => setPhase({ name: "verify-passkey", identityKeyName }),
      [],
    ),
    showKeyNotFound: useCallback(() => setKeyNotFound(true), []),
    hideKeyNotFound: useCallback(() => setKeyNotFound(false), []),
    showRestoreSuccess: useCallback((identityKeyName: string) => setRestoreSuccess(identityKeyName), []),
  };
}

type Nav = ReturnType<typeof usePhaseNavigation>;

function AuthSheetContent({ nav }: { nav: Nav }) {
  const loadingElement = <LoadingAnimation variant="onLightBackground" size={30} />;

  if (nav.phase.name === "restore-menu") {
    return (
      <RestoreMenuScreen
        onBack={nav.goToGetStarted}
        onSelectCloudRestore={nav.showKeyNotFound}
        onSelectCredentialRestore={nav.goToRestoreCredentials}
      />
    );
  }
  if (nav.phase.name === "restore-credentials") {
    return (
      <RestoreCredentialsScreen
        onBack={nav.goToRestoreMenu}
        onRestore={(data) => nav.showRestoreSuccess(data.identityKeyName)}
      />
    );
  }
  if (nav.phase.name === "set-new-password") {
    return (
      <SetNewPasswordScreen
        identityKeyName={nav.phase.identityKeyName}
        onBack={nav.goToRestoreCredentials}
        onContinue={() => nav.goToGetStarted()}
      />
    );
  }
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
      onNavigateToRestore={nav.goToRestoreMenu}
    />
  );
}

function PasswordOverlay({ nav }: { nav: Nav }) {
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
          <IdentityKeyNotFoundModal visible={nav.keyNotFound} onClose={nav.hideKeyNotFound} />
          <RestoreSuccessModal
            visible={nav.restoreSuccess !== null}
            onLogin={() => nav.goToSetNewPassword(nav.restoreSuccess!)}
          />
          <PasswordOverlay nav={nav} />
        </>
      )}
    </>
  );
}
