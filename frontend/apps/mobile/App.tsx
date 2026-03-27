import { useState } from "react";
import { StatusBar, View, Pressable, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@ion/ui";
import { CatalogScreen } from "@ion/ui";
import { createLocalization, registerTranslations, translate } from "@ion/localization";
import { ProfileSetupScreen, SelectLanguagesScreen, onboardingTranslations } from "@ion/onboarding-ui";
import { authTranslations } from "@ion/auth-ui";

const i18n = createLocalization();
registerTranslations(i18n, onboardingTranslations);
registerTranslations(i18n, authTranslations);

type OnboardingStep = "profile" | "languages" | null;

function OnboardingButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ padding: 16, backgroundColor: "#0166FF", borderRadius: 12, margin: 16, alignItems: "center" }}>
      <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 15 }}>{translate("onboarding:continueButton")}</Text>
    </Pressable>
  );
}

function AppContent() {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(null);

  if (onboardingStep === "profile") {
    return (
      <ProfileSetupScreen
        onContinue={() => setOnboardingStep("languages")}
        onBack={() => setOnboardingStep(null)}
      />
    );
  }

  if (onboardingStep === "languages") {
    return (
      <SelectLanguagesScreen
        onContinue={() => setOnboardingStep(null)}
        onBack={() => setOnboardingStep("profile")}
      />
    );
  }

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
