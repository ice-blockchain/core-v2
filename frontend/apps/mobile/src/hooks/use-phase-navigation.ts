import { useMemo, useState } from "react";

export type Phase =
  | { name: "catalog" }
  | { name: "onboarding" }
  | { name: "splash" }
  | { name: "intro" }
  | { name: "get-started" }
  | { name: "register" }
  | { name: "restore-menu" }
  | { name: "restore-key-not-found" }
  | { name: "restore-credentials" }
  | { name: "restore-success"; identityKeyName: string }
  | { name: "set-new-password"; identityKeyName: string }
  | { name: "verify-password"; identityKeyName: string }
  | { name: "verify-passkey"; identityKeyName: string; from?: "register" };

type SetPhase = (phase: Phase) => void;

function buildPhaseCallbacks(setPhase: SetPhase) {
  return {
    goToCatalog: () => setPhase({ name: "catalog" }),
    goToOnboarding: () => setPhase({ name: "onboarding" }),
    goToSplash: () => setPhase({ name: "splash" }),
    goToIntro: () => setPhase({ name: "intro" }),
    goToGetStarted: () => setPhase({ name: "get-started" }),
    goToRegister: () => setPhase({ name: "register" }),
    goToRestoreMenu: () => setPhase({ name: "restore-menu" }),
    goToRestoreKeyNotFound: () => setPhase({ name: "restore-key-not-found" }),
    goToRestoreCredentials: () => setPhase({ name: "restore-credentials" }),
    goToRestoreSuccess: (identityKeyName: string) => setPhase({ name: "restore-success", identityKeyName }),
    goToSetNewPassword: (identityKeyName: string) => setPhase({ name: "set-new-password", identityKeyName }),
    goToVerifyPassword: (identityKeyName: string) => setPhase({ name: "verify-password", identityKeyName }),
    goToVerifyPasskey: (identityKeyName: string, from?: "register") => setPhase({ name: "verify-passkey", identityKeyName, from }),
    // TODO: integrate with auth backend once available
    submitNewPassword: (_password: string) => setPhase({ name: "get-started" }),
  };
}

export function usePhaseNavigation() {
  const [phase, setPhase] = useState<Phase>({ name: "catalog" });
  const callbacks = useMemo(() => buildPhaseCallbacks(setPhase), []);

  return { phase, ...callbacks };
}

export type Nav = ReturnType<typeof usePhaseNavigation>;
