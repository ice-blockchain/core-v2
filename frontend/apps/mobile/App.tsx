import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@ion/ui";
import { SplashScreen } from "./src/components/splash-screen";

function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <SplashScreen />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default App;
