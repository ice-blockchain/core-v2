import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LoadingAnimation } from "../components/loading-animation";
import { SecuredByFooter } from "../components/secured-by-footer";
import { VerifyPasskeyIcon } from "../components/verify-passkey-icon";

const AUTO_DISMISS_DELAY = 3000;

interface VerifyPasskeyScreenProps {
  identityKeyName: string;
  onBack: () => void;
  onDismiss: () => void;
}

export function VerifyPasskeyScreen({ onDismiss }: VerifyPasskeyScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_DELAY);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <View style={styles.page}>
      <View style={styles.iconContainer}>
        <VerifyPasskeyIcon />
      </View>
      <Text style={styles.title}>Verify with a passkey</Text>
      <Text style={styles.subtitle}>
        Your device will prompt you to confirm this action using your
        fingerprint, face, or screen lock
      </Text>
      <View style={styles.loader}>
        <LoadingAnimation variant="onLightBackground" size={30} />
      </View>
      <View style={styles.footer}>
        <SecuredByFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    width: "100%",
    paddingTop: 50,
  },
  iconContainer: {
    width: 80,
    height: 80,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: "700",
    fontSize: 28,
    color: "#0E0E0E",
    marginBottom: 8,
  },
  subtitle: {
    fontWeight: "400",
    fontSize: 13,
    color: "#9A9A9A",
    textAlign: "center",
    maxWidth: 320,
    marginBottom: 40,
  },
  loader: {
    marginBottom: 40,
  },
  footer: {
    marginTop: "auto",
    paddingBottom: 40,
  },
});
