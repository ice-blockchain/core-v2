import {
  GetStartedScreen,
  IdentityKeyNotFoundModal,
  RegisterScreen,
  RestoreCredentialsScreen,
  RestoreMenuScreen,
  RestoreSuccessModal,
  SetNewPasswordScreen,
  VerifyPasskeyScreen,
  VerifyPasswordBackground,
  VerifyPasswordOverlay,
} from "@ion/auth-ui";
import type { Nav } from "../hooks/use-phase-navigation";
import { IONLoader } from "@ion/ui";

const loadingElement = (
  <IONLoader variant="light" size={30} />
);

function renderRestorePhase(nav: Nav) {
  if (nav.phase.name === "restore-key-not-found") {
    return <IdentityKeyNotFoundModal isVisible={true} onClose={nav.goToRestoreMenu} />;
  }
  if (nav.phase.name === "restore-success") {
    const { identityKeyName } = nav.phase;
    return (
      <RestoreSuccessModal
        isVisible={true}
        onClose={nav.goToRestoreMenu}
        onLogin={() => nav.goToSetNewPassword(identityKeyName)}
      />
    );
  }
  if (nav.phase.name === "set-new-password") {
    return (
      <SetNewPasswordScreen
        identityKeyName={nav.phase.identityKeyName}
        onBack={nav.goToRestoreCredentials}
        onContinue={nav.submitNewPassword}
      />
    );
  }
  if (nav.phase.name === "restore-credentials") {
    return (
      <RestoreCredentialsScreen
        onBack={nav.goToRestoreMenu}
        onRestore={(data) => nav.goToRestoreSuccess(data.identityKeyName)}
      />
    );
  }
  if (nav.phase.name === "restore-menu") {
    return (
      <RestoreMenuScreen
        onBack={nav.goToGetStarted}
        onSelectCloudRestore={nav.goToRestoreKeyNotFound}
        onSelectCredentialRestore={nav.goToRestoreCredentials}
      />
    );
  }
  return null;
}

function renderRegistrationPhase(nav: Nav) {
  if (nav.phase.name === "register") {
    return (
      <RegisterScreen
        onBack={nav.goToGetStarted}
        onContinue={({ identityKeyName }) =>
          nav.goToVerifyPassword(identityKeyName)
        }
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
        onBack={nav.phase.from === "register" ? nav.goToRegister : nav.goToRegister}
        onDismiss={nav.goToGetStarted}
        loadingElement={loadingElement}
      />
    );
  }
  return null;
}

export function AuthSheetContent({ nav }: { nav: Nav }) {
  return renderRestorePhase(nav) ?? renderRegistrationPhase(nav) ?? (
    <GetStartedScreen
      onNavigateToRegister={nav.goToRegister}
      onNavigateToVerifyPassword={nav.goToVerifyPassword}
      onNavigateToRestore={nav.goToRestoreMenu}
    />
  );
}

export function PasswordOverlay({ nav }: { nav: Nav }) {
  if (nav.phase.name !== "verify-password") return null;
  const { identityKeyName } = nav.phase;
  return (
    <VerifyPasswordOverlay
      onConfirm={() => nav.goToVerifyPasskey(identityKeyName, "register")}
    />
  );
}
