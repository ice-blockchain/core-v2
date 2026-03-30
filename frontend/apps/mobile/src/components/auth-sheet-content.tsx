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

function renderRestoreKeyNotFound(nav: Nav) {
  return <IdentityKeyNotFoundModal isVisible={true} onClose={nav.goToRestoreMenu} />;
}

function renderRestoreSuccess(nav: Nav, identityKeyName: string) {
  return (
    <RestoreSuccessModal
      isVisible={true}
      onClose={nav.goToRestoreMenu}
      onLogin={() => nav.goToSetNewPassword(identityKeyName)}
    />
  );
}

function renderSetNewPassword(nav: Nav, identityKeyName: string) {
  return (
    <SetNewPasswordScreen
      identityKeyName={identityKeyName}
      onBack={nav.goToRestoreCredentials}
      onContinue={nav.submitNewPassword}
    />
  );
}

function renderRestoreCredentials(nav: Nav) {
  return (
    <RestoreCredentialsScreen
      onBack={nav.goToRestoreMenu}
      onRestore={(data) => nav.goToRestoreSuccess(data.identityKeyName)}
    />
  );
}

function renderRestoreMenu(nav: Nav) {
  return (
    <RestoreMenuScreen
      onBack={nav.goToGetStarted}
      onSelectCloudRestore={nav.goToRestoreKeyNotFound}
      onSelectCredentialRestore={nav.goToRestoreCredentials}
    />
  );
}

function renderRestorePhase(nav: Nav) {
  if (nav.phase.name === "restore-key-not-found") return renderRestoreKeyNotFound(nav);
  if (nav.phase.name === "restore-success") return renderRestoreSuccess(nav, nav.phase.identityKeyName);
  if (nav.phase.name === "set-new-password") return renderSetNewPassword(nav, nav.phase.identityKeyName);
  if (nav.phase.name === "restore-credentials") return renderRestoreCredentials(nav);
  if (nav.phase.name === "restore-menu") return renderRestoreMenu(nav);
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
        onBack={nav.phase.from === "register" ? nav.goToRegister : () => nav.goToVerifyPassword(nav.phase.identityKeyName)}
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
