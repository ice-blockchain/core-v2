import { useCallback, useState } from "react";
import { Pressable, StatusBar, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ThemeProvider, CatalogScreen } from "@ion/ui";
import { createLocalization, registerTranslations } from "@ion/localization";
import { DiscoverCreatorsScreen, NotificationsScreen, ProfileSetupScreen, SelectLanguagesScreen, onboardingTranslations } from "@ion/onboarding-ui";
import { authTranslations } from "@ion/auth-ui";
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
import { SplashVideo } from "./src/components/splash-video";
import { IntroVideo } from "./src/components/intro-video";
import { BottomSheet } from "./src/components/bottom-sheet";
import { LoadingAnimation } from "./src/components/loading-animation";

const i18n = createLocalization();
registerTranslations(i18n, onboardingTranslations);
registerTranslations(i18n, authTranslations);

type OnboardingStep = "profile" | "languages" | "discover-creators" | "notifications";

const onboardingStepMap: Record<OnboardingStep, { Screen: typeof ProfileSetupScreen; next: OnboardingStep | null; prev: OnboardingStep | null }> = {
  "profile": { Screen: ProfileSetupScreen, next: "languages", prev: null },
  "languages": { Screen: SelectLanguagesScreen, next: "discover-creators", prev: "profile" },
  "discover-creators": { Screen: DiscoverCreatorsScreen, next: "notifications", prev: "languages" },
  "notifications": { Screen: NotificationsScreen, next: null, prev: "discover-creators" },
};

function OnboardingFlow({ step, setStep }: { step: OnboardingStep; setStep: (s: OnboardingStep | null) => void }) {
  const config = onboardingStepMap[step];
  return (
    <config.Screen
      onContinue={() => setStep(config.next)}
      onBack={() => setStep(config.prev)}
    />
  );
}

type Phase =
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
  | { name: "verify-passkey"; identityKeyName: string };

function usePhaseNavigation() {
  const [phase, setPhase] = useState<Phase>({ name: "catalog" });

  return {
    phase,
    goToCatalog: useCallback(() => setPhase({ name: "catalog" }), []),
    goToOnboarding: useCallback(() => setPhase({ name: "onboarding" }), []),
    goToSplash: useCallback(() => setPhase({ name: "splash" }), []),
    goToIntro: useCallback(() => setPhase({ name: "intro" }), []),
    goToGetStarted: useCallback(() => setPhase({ name: "get-started" }), []),
    goToRegister: useCallback(() => setPhase({ name: "register" }), []),
    goToRestoreMenu: useCallback(() => setPhase({ name: "restore-menu" }), []),
    goToRestoreKeyNotFound: useCallback(
      () => setPhase({ name: "restore-key-not-found" }),
      [],
    ),
    goToRestoreCredentials: useCallback(
      () => setPhase({ name: "restore-credentials" }),
      [],
    ),
    goToRestoreSuccess: useCallback(
      (identityKeyName: string) =>
        setPhase({ name: "restore-success", identityKeyName }),
      [],
    ),
    goToSetNewPassword: useCallback(
      (identityKeyName: string) =>
        setPhase({ name: "set-new-password", identityKeyName }),
      [],
    ),
    goToVerifyPassword: useCallback(
      (identityKeyName: string) =>
        setPhase({ name: "verify-password", identityKeyName }),
      [],
    ),
    goToVerifyPasskey: useCallback(
      (identityKeyName: string) =>
        setPhase({ name: "verify-passkey", identityKeyName }),
      [],
    ),
  };
}

type Nav = ReturnType<typeof usePhaseNavigation>;

function AuthSheetContent({ nav }: { nav: Nav }) {
  const loadingElement = (
    <LoadingAnimation variant="onLightBackground" size={30} />
  );

  if (nav.phase.name === "restore-key-not-found") {
    return <IdentityKeyNotFoundModal onClose={nav.goToRestoreMenu} />;
  }
  if (nav.phase.name === "restore-success") {
    const { identityKeyName } = nav.phase;
    return (
      <RestoreSuccessModal
        onLogin={() => nav.goToSetNewPassword(identityKeyName)}
      />
    );
  }
  if (nav.phase.name === "set-new-password") {
    const { identityKeyName } = nav.phase;
    return (
      <SetNewPasswordScreen
        identityKeyName={identityKeyName}
        onBack={nav.goToRestoreCredentials}
        onContinue={nav.goToGetStarted}
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
  return (
    <VerifyPasswordOverlay
      onConfirm={() => nav.goToVerifyPasskey(identityKeyName)}
    />
  );
}

function NavButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 16,
        backgroundColor: "#0166FF",
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        alignItems: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 15 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function isAuthPhase(phase: Phase): boolean {
  return !["catalog", "onboarding"].includes(phase.name);
}

function AppContent() {
  const nav = usePhaseNavigation();
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(null);

  if (nav.phase.name === "onboarding" || onboardingStep) {
    if (!onboardingStep) setOnboardingStep("profile");
    if (onboardingStep) return <OnboardingFlow step={onboardingStep} setStep={(s) => { setOnboardingStep(s); if (!s) nav.goToCatalog(); }} />;
  }

  if (nav.phase.name === "splash") {
    return <SplashVideo onComplete={nav.goToIntro} />;
  }

  if (isAuthPhase(nav.phase)) {
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

  const navButtons = (
    <>
      <NavButton label="Auth Flow" onPress={nav.goToSplash} />
      <NavButton label="Onboarding" onPress={nav.goToOnboarding} />
    </>
  );

  return <CatalogScreen headerSlot={navButtons} />;
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <BottomSheetModalProvider>
            <StatusBar barStyle="light-content" />
            <AppContent />
          </BottomSheetModalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
