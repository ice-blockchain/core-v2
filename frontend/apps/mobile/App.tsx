import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SplashScreen } from "./src/components/splash-screen";

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <SplashScreen />
    </SafeAreaProvider>
  );
}

export default App;
