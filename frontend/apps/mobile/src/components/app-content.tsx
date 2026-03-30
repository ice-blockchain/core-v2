import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { CatalogScreen } from "@ion/ui";
import {
  DiscoverCreatorsScreen,
  NotificationsScreen,
  ProfileSetupScreen,
  SelectLanguagesScreen,
} from "@ion/onboarding-ui";
import { PrimaryButton } from "@ion/auth-ui";
import type { Phase } from "../hooks/use-phase-navigation";
import { usePhaseNavigation } from "../hooks/use-phase-navigation";
import { AuthSheetContent, PasswordOverlay } from "./auth-sheet-content";
import { SplashVideo } from "./splash-video";
import { IntroVideo } from "./intro-video";
import { BottomSheet } from "./bottom-sheet";

type OnboardingStep = "profile" | "languages" | "discover-creators" | "notifications";

const onboardingStepMap: Record<OnboardingStep, {
  Screen: typeof ProfileSetupScreen;
  next: OnboardingStep | null;
  prev: OnboardingStep | null;
}> = {
  "profile": { Screen: ProfileSetupScreen, next: "languages", prev: null },
  "languages": { Screen: SelectLanguagesScreen, next: "discover-creators", prev: "profile" },
  "discover-creators": { Screen: DiscoverCreatorsScreen, next: "notifications", prev: "languages" },
  "notifications": { Screen: NotificationsScreen, next: null, prev: "discover-creators" },
};

function OnboardingFlow({ step, setStep }: {
  step: OnboardingStep;
  setStep: (s: OnboardingStep | null) => void;
}) {
  const config = onboardingStepMap[step];
  return (
    <config.Screen
      onContinue={() => setStep(config.next)}
      onBack={() => setStep(config.prev)}
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

function AuthContent({ nav }: { nav: ReturnType<typeof usePhaseNavigation> }) {
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

export function AppContent() {
  const nav = usePhaseNavigation();
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(null);

  const handleStepChange = useCallback((step: OnboardingStep | null) => {
    setOnboardingStep(step);
    if (!step) nav.goToCatalog();
  }, [nav]);

  if (nav.phase.name === "onboarding" || onboardingStep) {
    return <OnboardingFlow step={onboardingStep ?? "profile"} setStep={handleStepChange} />;
  }
  if (nav.phase.name === "splash") return <SplashVideo onComplete={nav.goToIntro} />;
  if (isAuthPhase(nav.phase)) return <AuthContent nav={nav} />;

  return (
    <CatalogScreen headerSlot={
      <>
        <NavButton label="Auth Flow" onPress={nav.goToSplash} />
        <NavButton label="Onboarding" onPress={nav.goToOnboarding} />
      </>
    } />
  );
}
