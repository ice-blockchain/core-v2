import { useState } from "react";
import { StatusBar, View, Pressable, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@ion/ui";
import { CatalogScreen } from "@ion/ui";
import { createLocalization, registerTranslations, translate } from "@ion/localization";
import { DiscoverCreatorsScreen, NotificationsScreen, ProfileSetupScreen, SelectLanguagesScreen, onboardingTranslations } from "@ion/onboarding-ui";
import { authTranslations } from "@ion/auth-ui";

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

function OnboardingButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ padding: 16, backgroundColor: "#0166FF", borderRadius: 12, margin: 16, alignItems: "center" }}>
      <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 15 }}>{translate("onboarding:continueButton")}</Text>
    </Pressable>
  );
}

function AppContent() {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(null);

  if (onboardingStep) return <OnboardingFlow step={onboardingStep} setStep={setOnboardingStep} />;

  return (
    <View style={{ flex: 1 }}>
      <CatalogScreen />
      <OnboardingButton onPress={() => setOnboardingStep("profile")} />
    </View>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar barStyle="light-content" />
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
