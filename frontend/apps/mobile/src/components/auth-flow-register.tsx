import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { TextField } from "@ion/ui";
import { translate } from "@ion/localization";
import {
  PrimaryButton, RegisterHeader, RegisterPasswordIcon, RegisterPasskeyIcon,
  PasswordStrengthChecklist, SecuredByFooter, TermsFooter,
  PasswordIcon, EyeIcon, IdentityKeyIcon, InfoIcon,
  validateIdentityKeyName, buildPasswordRules, areAllPasswordRulesMet,
  PasskeyBenefitList, IdentityKeyNameInput, useIdentityKeyValidation,
} from "@ion/auth-ui";
import type { RegisterCallbacks } from "@ion/auth";

interface AuthFlowRegisterProps {
  callbacks: RegisterCallbacks;
}

export function AuthFlowRegister({ callbacks }: AuthFlowRegisterProps) {
  if (callbacks.passkeyAvailable) {
    return <AuthFlowPasskeyRegister callbacks={callbacks} />;
  }
  return <AuthFlowPasswordRegister callbacks={callbacks} />;
}

function AuthFlowPasskeyRegister({ callbacks }: AuthFlowRegisterProps) {
  const identity = useIdentityKeyValidation();

  const handleContinue = useCallback(() => {
    if (!identity.validate()) return;
    callbacks.onContinue({ identityKeyName: identity.value, password: undefined });
  }, [identity, callbacks]);

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <RegisterHeader icon={<RegisterPasskeyIcon />} title={translate("auth:passkeyRegisterTitle")} />
      <PasskeyBenefitList />
      <View style={styles.passkeyInput}>
        <IdentityKeyNameInput identity={identity} />
      </View>
      <View style={styles.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={handleContinue} />
      </View>
    </ScrollView>
  );
}

function usePasswordRegisterForm() {
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
    identityKeyName, setIdentityKeyName, identityKeyError,
    password, setPassword, confirmPassword, setConfirmPassword,
    showPassword, toggleShowPassword: useCallback(() => setShowPassword((v) => !v), []),
    showConfirm, toggleShowConfirm: useCallback(() => setShowConfirm((v) => !v), []),
    isFormValid, isPasswordMatch, passwordRules: buildPasswordRules(password),
  };
}

function AuthFlowPasswordRegister({ callbacks }: AuthFlowRegisterProps) {
  const form = usePasswordRegisterForm();

  const handleContinue = useCallback(() => {
    if (!form.isFormValid) return;
    callbacks.onContinue({ identityKeyName: form.identityKeyName, password: form.password });
  }, [form.isFormValid, form.identityKeyName, form.password, callbacks]);

  const identityKeyErrorProps = form.identityKeyError
    ? { state: "error" as const, errorMessage: form.identityKeyError }
    : {};

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <RegisterHeader
        icon={<RegisterPasswordIcon />}
        title={translate("auth:registerTitle")}
        subtitle={translate("auth:registerSubtitle")}
      />
      <View style={styles.formContainer}>
        <TextField
          label={translate("auth:identityKeyNameLabel")}
          value={form.identityKeyName}
          onChangeText={form.setIdentityKeyName}
          prefixIcon={<IdentityKeyIcon />}
          hasPrefixDivider
          suffixIcon={<InfoIcon />}
          {...identityKeyErrorProps}
          style={styles.field}
        />
        <TextField
          label={translate("auth:passwordLabel")}
          value={form.password}
          onChangeText={form.setPassword}
          prefixIcon={<PasswordIcon />}
          hasPrefixDivider
          suffixIcon={<Pressable onPress={form.toggleShowPassword}><EyeIcon isOff={!form.showPassword} /></Pressable>}
          isSecureTextEntry={!form.showPassword}
          textInputProps={{ textContentType: "oneTimeCode", autoComplete: "off", autoCorrect: false }}
          style={styles.field}
        />
        <TextField
          label={translate("auth:confirmPasswordLabel")}
          value={form.confirmPassword}
          onChangeText={form.setConfirmPassword}
          prefixIcon={<PasswordIcon />}
          hasPrefixDivider
          suffixIcon={<Pressable onPress={form.toggleShowConfirm}><EyeIcon isOff={!form.showConfirm} /></Pressable>}
          isSecureTextEntry={!form.showConfirm}
          textInputProps={{ textContentType: "oneTimeCode", autoComplete: "off", autoCorrect: false }}
          style={styles.field}
        />
      </View>
      <View style={styles.checklist}>
        <PasswordStrengthChecklist
          rules={[...form.passwordRules, { label: translate("auth:passwordsMatchLabel"), isMet: form.isPasswordMatch }]}
        />
      </View>
      <View style={styles.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={handleContinue} disabled={!form.isFormValid} />
      </View>
      <View style={styles.footer}>
        <SecuredByFooter />
        <TermsFooter />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: "center", width: "100%" },
  formContainer: { marginTop: 24, gap: 16 },
  field: { width: 287 },
  checklist: { marginTop: 16, width: 287 },
  passkeyInput: { marginTop: 24, alignSelf: "stretch", paddingHorizontal: 44 },
  continueWrapper: { marginTop: 24 },
  footer: { marginTop: 40, alignItems: "center", gap: 12, paddingBottom: 40 },
});
