import { useCallback, useMemo, useState } from "react";
import type { ViewStyle } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { TextField, useTheme } from "@ion/ui";
import { useSheetScroll } from "@ion/navigation";
import { translate } from "@ion/localization";
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
  const isPasswordFormValid = isPasswordValid && isPasswordMatch;
  const isFormValid = isIdentityKeyValid && isPasswordFormValid;

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
type ScaledStyles = ReturnType<typeof useScaledStyles>;

function useScaledStyles(scaleSize: (n: number) => number) {
  return useMemo(() => ({
    formContainer: { marginTop: scaleSize(24), gap: scaleSize(16) } as ViewStyle,
    field: { width: scaleSize(287) } as ViewStyle,
    checklist: { marginTop: scaleSize(16), width: scaleSize(287) } as ViewStyle,
    continueWrapper: { marginTop: scaleSize(24) } as ViewStyle,
    footer: { marginTop: scaleSize(40), alignItems: "center" as const, gap: scaleSize(12), paddingBottom: scaleSize(40) } as ViewStyle,
  }), [scaleSize]);
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  fieldStyle: ViewStyle;
}

function PasswordField({ label, value, onChangeText, show, onToggle, fieldStyle }: PasswordFieldProps) {
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
      style={fieldStyle}
    />
  );
}

function IdentityKeyField({ form, fieldStyle }: { form: FormState; fieldStyle: ViewStyle }) {
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
      style={fieldStyle}
    />
  );
}

function RegisterFormFields({ form, scaled }: { form: FormState; scaled: ScaledStyles }) {
  return (
    <View style={scaled.formContainer}>
      <IdentityKeyField form={form} fieldStyle={scaled.field} />
      <PasswordField
        label={translate("auth:passwordLabel")}
        value={form.password}
        onChangeText={form.setPassword}
        show={form.showPassword}
        onToggle={form.toggleShowPassword}
        fieldStyle={scaled.field}
      />
      <PasswordField
        label={translate("auth:confirmPasswordLabel")}
        value={form.confirmPassword}
        onChangeText={form.setConfirmPassword}
        show={form.showConfirm}
        onToggle={form.toggleShowConfirm}
        fieldStyle={scaled.field}
      />
    </View>
  );
}

function RegisterContent({ form, onContinue, scaled }: { form: FormState; onContinue: () => void; scaled: ScaledStyles }) {
  const sheetScroll = useSheetScroll();
  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <RegisterHeader
        icon={<RegisterPasswordIcon />}
        title={translate("auth:registerTitle")}
        subtitle={translate("auth:registerSubtitle")}
      />
      <RegisterFormFields form={form} scaled={scaled} />
      <View style={scaled.checklist}>
        <PasswordStrengthChecklist
          rules={[...form.passwordRules, { label: translate("auth:passwordsMatchLabel"), isMet: form.isPasswordMatch }]}
        />
      </View>
      <View style={scaled.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={onContinue} disabled={!form.isFormValid} />
      </View>
      <View style={scaled.footer}>
        <SecuredByFooter />
        <TermsFooter />
      </View>
    </BottomSheetScrollView>
  );
}

export interface RegisterScreenCallbacks {
  onBack: () => void;
  onContinue: (data: { identityKeyName: string; password?: string }) => void;
  isPasskeyAvailable: boolean;
}

export interface PasswordRegisterScreenProps {
  callbacks?: RegisterScreenCallbacks;
}

export function PasswordRegisterScreen({ callbacks }: PasswordRegisterScreenProps) {
  const form = useRegisterPasswordForm();
  const { colors, scale } = useTheme();
  const scaled = useScaledStyles(scale.scaleSize);

  const containerStyle = useMemo(
    () => ({ flex: 1 as const, backgroundColor: colors.secondaryBackground }),
    [colors],
  );

  const handleContinue = useCallback(() => {
    if (!form.isFormValid) return;
    callbacks?.onContinue({ identityKeyName: form.identityKeyName, password: form.password });
  }, [form.isFormValid, form.identityKeyName, form.password, callbacks]);

  return (
    <View style={containerStyle}>
      <RegisterContent form={form} onContinue={handleContinue} scaled={scaled} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
    width: "100%",
  },
});
