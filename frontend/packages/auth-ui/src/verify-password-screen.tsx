import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text, TextField, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { PasswordIcon } from "./password-icon";
import { EyeIcon } from "./eye-icon";
import { VerifyPasskeyIcon } from "./verify-passkey-icon";
import { VerifyPasswordIcon } from "./verify-password-icon";
import { SecuredByFooter } from "./secured-by-footer";

interface VerifyPasswordBackgroundProps {
  loadingElement: ReactNode;
}

export function VerifyPasswordBackground({ loadingElement }: VerifyPasswordBackgroundProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.background}>
      <View style={styles.iconContainer}>
        <VerifyPasskeyIcon />
      </View>
      <Text variant="headline1" color={colors.primaryText}>{translate("auth:verifyPasswordTitle")}</Text>
      <Text variant="body2" color={colors.tertiaryText} style={styles.subtitle}>
        {translate("auth:verifyPasswordSubtitle")}
      </Text>
      <View style={styles.loader}>{loadingElement}</View>
      <View style={styles.footer}>
        <SecuredByFooter />
      </View>
    </View>
  );
}

function InnerSheetHeader() {
  const { colors } = useTheme();

  return (
    <>
      <View style={styles.innerIconContainer}>
        <VerifyPasswordIcon />
      </View>
      <Text variant="title" color={colors.primaryText}>{translate("auth:verifyPasswordTitle")}</Text>
      <Text variant="body2" color={colors.secondaryText} style={styles.innerSubtitle}>
        {translate("auth:verifyPasswordConfirmSubtitle")}
      </Text>
    </>
  );
}

function useConfirmButtonStyle() {
  const { colors } = useTheme();
  return useMemo(() => ({
    ...styles.confirmButton,
    backgroundColor: colors.primaryAccent,
  }), [colors.primaryAccent]);
}

function InnerSheetForm({ onConfirm }: { onConfirm: (password: string) => void }) {
  const { colors } = useTheme();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const toggleShowPassword = useCallback(() => setShowPassword((v) => !v), []);
  const confirmButtonStyle = useConfirmButtonStyle();

  return (
    <View style={styles.innerContent}>
      <InnerSheetHeader />
      <View style={styles.innerInput}>
        <TextField
          label={translate("auth:passwordLabel")}
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
      <Pressable style={confirmButtonStyle} onPress={() => { if (password.trim()) onConfirm(password); }}>
        <Text variant="body" color={colors.onPrimaryAccent}>{translate("auth:confirmButton")}</Text>
      </Pressable>
    </View>
  );
}

interface VerifyPasswordOverlayProps {
  onConfirm: (password: string) => void;
}

export function VerifyPasswordOverlay({ onConfirm }: VerifyPasswordOverlayProps) {
  const { colors } = useTheme();

  const overlayStyle = useMemo(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backgroundSheet,
    justifyContent: "flex-end" as const,
    zIndex: 20,
  }), [colors.backgroundSheet]);

  const innerSheetStyle = useMemo(() => ({
    ...styles.innerSheet,
    backgroundColor: colors.secondaryBackground,
  }), [colors.secondaryBackground]);

  const handleStyle = useMemo(() => ({
    ...styles.innerHandle,
    backgroundColor: colors.sheetLine,
  }), [colors.sheetLine]);

  return (
    <KeyboardAvoidingView
      style={overlayStyle}
      behavior={Platform.select({ ios: "padding", android: "height" })}
    >
      <View style={innerSheetStyle}>
        <View style={handleStyle} />
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
  subtitle: {
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
  innerSheet: {
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
  innerSubtitle: {
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
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
