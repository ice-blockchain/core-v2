import { useState } from "react";
import { StatusBar, View, Pressable, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@ion/ui";
import { CatalogScreen } from "@ion/ui";
import { ProfileSetupScreen } from "@ion/onboarding-ui";

function OnboardingButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ padding: 16, backgroundColor: "#0166FF", borderRadius: 12, margin: 16, alignItems: "center" }}>
      <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 15 }}>Onboarding</Text>
    </Pressable>
  );
}

function AppContent() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showOnboarding) {
    return (
      <ProfileSetupScreen
        onContinue={() => setShowOnboarding(false)}
        onBack={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CatalogScreen />
      <OnboardingButton onPress={() => setShowOnboarding(true)} />
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
