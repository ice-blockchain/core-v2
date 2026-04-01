import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { TextField, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
import { PrimaryButton } from "./primary-button";
import { RegisterHeader } from "./register-header";
import { RegisterPasswordIcon } from "./register-password-icon";
import { PasswordStrengthChecklist } from "./password-strength-checklist";
import { SecuredByFooter } from "./secured-by-footer";
import { TermsFooter } from "./terms-footer";
import { IdentityKeyIcon } from "./identity-key-icon";
import { InfoIcon } from "./info-icon";
import { PasswordIcon } from "./password-icon";
import { EyeIcon } from "./eye-icon";
import { validateIdentityKeyName } from "./identity-key-rules";
import { buildPasswordRules, areAllPasswordRulesMet } from "./password-rules";


function useRegisterPasswordForm() {
  const [identityKeyName, setIdentityKeyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const identityKeyError = validateIdentityKeyName(identityKeyName);
  const isIdentityKeyValid = identityKeyName.trim().length > 0 && !identityKeyError;
  const isPasswordValid = areAllPasswordRulesMet(password);
  const isPasswordMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = isIdentityKeyValid && isPasswordValid && isPasswordMatch;

  return {
    identityKeyName, setIdentityKeyName,
    identityKeyError,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, toggleShowPassword: useCallback(() => setShowPassword((v) => !v), []),
    showConfirm, toggleShowConfirm: useCallback(() => setShowConfirm((v) => !v), []),
    isFormValid, isPasswordMatch,
    passwordRules: buildPasswordRules(password),
  };
}

type FormState = ReturnType<typeof useRegisterPasswordForm>;

interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}

function PasswordField({ label, value, onChangeText, show, onToggle }: PasswordFieldProps) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      prefixIcon={<PasswordIcon />}
      hasPrefixDivider
      suffixIcon={<Pressable onPress={onToggle}><EyeIcon isOff={!show} /></Pressable>}
      isSecureTextEntry={!show}
      textInputProps={{ textContentType: "oneTimeCode", autoComplete: "off", autoCorrect: false }}
      style={styles.field}
    />
  );
}

function IdentityKeyField({ form }: { form: FormState }) {
  const errorProps = form.identityKeyError
    ? { state: "error" as const, errorMessage: form.identityKeyError }
    : {};
  return (
    <TextField
      label={translate("auth:identityKeyNameLabel")}
      value={form.identityKeyName}
      onChangeText={form.setIdentityKeyName}
      prefixIcon={<IdentityKeyIcon />}
      hasPrefixDivider
      suffixIcon={<InfoIcon />}
      {...errorProps}
      style={styles.field}
    />
  );
}

function RegisterFormFields({ form }: { form: FormState }) {
  return (
    <View style={styles.formContainer}>
      <IdentityKeyField form={form} />
      <PasswordField
        label={translate("auth:passwordLabel")}
        value={form.password}
        onChangeText={form.setPassword}
        show={form.showPassword}
        onToggle={form.toggleShowPassword}
      />
      <PasswordField
        label={translate("auth:confirmPasswordLabel")}
        value={form.confirmPassword}
        onChangeText={form.setConfirmPassword}
        show={form.showConfirm}
        onToggle={form.toggleShowConfirm}
      />
    </View>
  );
}

function RegisterContent({ form, onContinue }: { form: FormState; onContinue: () => void }) {
  const sheetScroll = useSheetScroll();

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
      <View style={styles.page}>
        <RegisterHeader
          icon={<RegisterPasswordIcon />}
          title={translate("auth:registerTitle")}
          subtitle={translate("auth:registerSubtitle")}
        />
        <RegisterFormFields form={form} />
        <View style={styles.checklist}>
          <PasswordStrengthChecklist
            rules={[...form.passwordRules, { label: translate("auth:passwordsMatchLabel"), isMet: form.isPasswordMatch }]}
          />
        </View>
        <View style={styles.continueWrapper}>
          <PrimaryButton label={translate("auth:continueButton")} onPress={onContinue} disabled={!form.isFormValid} />
        </View>
        <View style={styles.footer}>
          <SecuredByFooter />
          <TermsFooter />
        </View>
      </View>
    </BottomSheetScrollView>
  );
}

function useContainerStyle() {
  const theme = useTheme();
  return useMemo(
    () => ({ flex: 1 as const, backgroundColor: theme.colors.secondaryBackground }),
    [theme.colors],
  );
}

export function RegisterScreen() {
  const navigation = useAuthNavigation();
  const form = useRegisterPasswordForm();
  const containerStyle = useContainerStyle();

  const handleContinue = useCallback(() => {
    if (!form.isFormValid) return;
    navigation.navigate(Routes.Auth.ProfileSetup);
  }, [form.isFormValid, navigation]);

  return (
    <View style={containerStyle}>
      <RegisterContent form={form} onContinue={handleContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
    width: "100%",
  },
  formContainer: {
    marginTop: 24,
    gap: 16,
  },
  field: {
    width: 287,
  },
  checklist: {
    marginTop: 16,
    width: 287,
  },
  continueWrapper: {
    marginTop: 24,
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
    gap: 12,
    paddingBottom: 40,
  },
});
