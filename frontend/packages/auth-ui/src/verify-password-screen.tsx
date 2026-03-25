import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { TextField } from "@ion/ui";
import { PasswordIcon } from "./password-icon";
import { EyeIcon } from "./eye-icon";
import { VerifyPasskeyIcon } from "./verify-passkey-icon";
import { VerifyPasswordIcon } from "./verify-password-icon";
import { SecuredByFooter } from "./secured-by-footer";

interface VerifyPasswordBackgroundProps {
  loadingElement: ReactNode;
}

export function VerifyPasswordBackground({ loadingElement }: VerifyPasswordBackgroundProps) {
  return (
    <View style={styles.background}>
      <View style={styles.iconContainer}>
        <VerifyPasskeyIcon />
      </View>
      <Text style={styles.title}>Verify with password</Text>
      <Text style={styles.subtitle}>
        Your device will ask your password to confirm
      </Text>
      <View style={styles.loader}>{loadingElement}</View>
      <View style={styles.footer}>
        <SecuredByFooter />
      </View>
    </View>
  );
}

function InnerSheetHeader() {
  return (
    <>
      <View style={styles.innerIconContainer}>
        <VerifyPasswordIcon />
      </View>
      <Text style={styles.innerTitle}>Verify with password</Text>
      <Text style={styles.innerSubtitle}>
        Please confirm your password to continue.
      </Text>
    </>
  );
}

function InnerSheetForm({ onConfirm }: { onConfirm: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const toggleShowPassword = useCallback(() => setShowPassword((v) => !v), []);

  return (
    <View style={styles.innerContent}>
      <InnerSheetHeader />
      <View style={styles.innerInput}>
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          prefixIcon={<PasswordIcon />}
          hasPrefixDivider
          suffixIcon={<Pressable onPress={toggleShowPassword}><EyeIcon isOff={!showPassword} /></Pressable>}
          isSecureTextEntry={!showPassword}
          textInputProps={{ textContentType: "oneTimeCode", autoComplete: "off", autoCorrect: false }}
          style={styles.fieldWidth}
        />
      </View>
      <Pressable style={styles.confirmButton} onPress={onConfirm}>
        <Text style={styles.confirmLabel}>Confirm</Text>
      </Pressable>
    </View>
  );
}

interface VerifyPasswordOverlayProps {
  onConfirm: () => void;
}

export function VerifyPasswordOverlay({ onConfirm }: VerifyPasswordOverlayProps) {
  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.select({ ios: "padding", android: "height" })}
    >
      <View style={styles.innerSheet}>
        <View style={styles.innerHandle} />
        <InnerSheetForm onConfirm={onConfirm} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    alignItems: "center",
    paddingTop: 50,
    width: "100%",
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 21, 50, 0.7)",
    justifyContent: "flex-end",
    zIndex: 20,
  },
  innerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 50,
  },
  innerHandle: {
    width: 50,
    height: 3,
    borderRadius: 5,
    backgroundColor: "#B8BCCA",
    marginBottom: 20,
  },
  innerContent: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
  },
  innerIconContainer: {
    width: 80,
    height: 80,
    marginBottom: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  innerTitle: {
    fontWeight: "600",
    fontSize: 17,
    color: "#0E0E0E",
    marginBottom: 8,
  },
  innerSubtitle: {
    fontWeight: "400",
    fontSize: 13,
    color: "#494949",
    textAlign: "center",
    marginBottom: 24,
  },
  innerInput: {
    marginBottom: 24,
  },
  fieldWidth: {
    width: 287,
  },
  confirmButton: {
    width: 343,
    height: 56,
    backgroundColor: "#0166FF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLabel: {
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 18,
    color: "#FFFFFF",
  },
});
