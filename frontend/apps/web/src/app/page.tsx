"use client";

import { useCallback, useState } from "react";
import { timingConfig } from "@ion/config";
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
import type { CSSProperties } from "react";
import { SplashVideo } from "@/components/splash-video";
import { IntroVideo } from "@/components/intro-video";
import { IONLoader } from "@ion/ui";
import { BottomSheet } from "@/components/bottom-sheet";

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

function usePhaseCallbacks(setPhase: (p: Phase) => void, setRestoreSuccess: (s: string | null) => void, setKeyNotFound: (b: boolean) => void) {
  return {
    goToIntro: useCallback(() => setPhase({ name: "intro" }), [setPhase]),
    goToGetStarted: useCallback(() => setPhase({ name: "get-started" }), [setPhase]),
    goToRegister: useCallback(() => setPhase({ name: "register" }), [setPhase]),
    goToVerifyPassword: useCallback((identityKeyName: string) => setPhase({ name: "verify-password", identityKeyName }), [setPhase]),
    goToRestoreMenu: useCallback(() => setPhase({ name: "restore-menu" }), [setPhase]),
    goToRestoreCredentials: useCallback(() => setPhase({ name: "restore-credentials" }), [setPhase]),
    goToSetNewPassword: useCallback((identityKeyName: string) => { setRestoreSuccess(null); setPhase({ name: "set-new-password", identityKeyName }); }, [setPhase, setRestoreSuccess]),
    goToVerifyPasskey: useCallback((identityKeyName: string) => setPhase({ name: "verify-passkey", identityKeyName }), [setPhase]),
    showKeyNotFound: useCallback(() => setKeyNotFound(true), [setKeyNotFound]),
    hideKeyNotFound: useCallback(() => setKeyNotFound(false), [setKeyNotFound]),
    showRestoreSuccess: useCallback((identityKeyName: string) => setRestoreSuccess(identityKeyName), [setRestoreSuccess]),
    hideRestoreSuccess: useCallback(() => setRestoreSuccess(null), [setRestoreSuccess]),
  };
}

function usePhaseNavigation() {
  const initialPhase: Phase = timingConfig.splashDurationMs > 0 ? { name: "splash" } : { name: "intro" };
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [keyNotFound, setKeyNotFound] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const callbacks = usePhaseCallbacks(setPhase, setRestoreSuccess, setKeyNotFound);

  return { phase, keyNotFound, restoreSuccess, ...callbacks };
}

type Nav = ReturnType<typeof usePhaseNavigation>;

function renderRestorePhase(nav: Nav) {
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
        onContinue={(_password: string) => nav.goToGetStarted()}
      />
    );
  }
  return null;
}

function renderAuthPhase(nav: Nav) {
  const loadingElement = <IONLoader variant="light" size={30} />;

  if (nav.phase.name === "register") {
    return <RegisterScreen onBack={nav.goToGetStarted} onContinue={({ identityKeyName }) => nav.goToVerifyPassword(identityKeyName)} />;
  }
  if (nav.phase.name === "verify-password") {
    return <VerifyPasswordBackground loadingElement={loadingElement} />;
  }
  if (nav.phase.name === "verify-passkey") {
    return <VerifyPasskeyScreen identityKeyName={nav.phase.identityKeyName} onBack={nav.goToRegister} onDismiss={nav.goToGetStarted} loadingElement={loadingElement} />;
  }
  return null;
}

function AuthSheetContent({ nav }: { nav: Nav }) {
  return renderRestorePhase(nav) ?? renderAuthPhase(nav) ?? (
    <GetStartedScreen
      onNavigateToRegister={nav.goToRegister}
      onNavigateToVerifyPassword={nav.goToVerifyPassword}
      onNavigateToRestore={nav.goToRestoreMenu}
    />
  );
}

function PasswordOverlay({ nav }: { nav: Nav }) {
  if (nav.phase.name !== "verify-password") return null;
  const { identityKeyName } = nav.phase;
  return <VerifyPasswordOverlay onConfirm={() => nav.goToVerifyPasskey(identityKeyName)} />;
}

const pageStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100vh",
};

export default function SplashPage() {
  const nav = usePhaseNavigation();

  if (nav.phase.name === "splash") {
    return <SplashVideo onComplete={nav.goToIntro} />;
  }

  return (
    <div style={pageStyle}>
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
          <IdentityKeyNotFoundModal isVisible={nav.keyNotFound} onClose={nav.hideKeyNotFound} />
          <RestoreSuccessModal
            isVisible={nav.restoreSuccess !== null}
            onClose={nav.hideRestoreSuccess}
            onLogin={() => { if (nav.restoreSuccess) nav.goToSetNewPassword(nav.restoreSuccess); }}
          />
          <PasswordOverlay nav={nav} />
        </>
      )}
    </div>
  );
}
