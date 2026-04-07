import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAppNavigation, useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
import { PrimaryButton } from "./primary-button";
import { RegisterHeader } from "./register-header";
import { RegisterPasswordIcon } from "./register-password-icon";
import { IdentityKeyNameInput } from "./identity-key-name-input";
import { PasswordInput } from "./password-input";
import { PasswordStrengthChecklist } from "./password-strength-checklist";
import { AuthFooter } from "./auth-footer";
import { useIdentityKeyValidation } from "./identity-key-rules";
import { buildPasswordRules, areAllPasswordRulesMet } from "./password-rules";
import { useAuthActions } from "./auth-actions-context";

function usePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isPasswordValid = areAllPasswordRulesMet(password);
  const hasConfirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isPasswordMatch = password.length > 0 && password === confirmPassword;
  const isPasswordEmpty = password.length === 0 && confirmPassword.length === 0;
  const isPasswordFormValid = isPasswordValid && isPasswordMatch;

  return {
    password, setPassword,
    confirmPassword, setConfirmPassword,
    isPasswordFormValid, isPasswordEmpty, hasConfirmMismatch,
    passwordRules: buildPasswordRules(password),
    confirmPasswordRules: buildPasswordRules(confirmPassword),
  };
}

export interface RegisterScreenCallbacks {
  onContinue: (data: { identityKeyName: string; password?: string }) => void;
  onBack: () => void;
  isPasskeyAvailable?: boolean;
}

function buildConfirmErrorProps(hasConfirmMismatch: boolean) {
  if (!hasConfirmMismatch) return {};
  return { state: "error" as const, errorMessage: translate("auth:passwordMismatchError") };
}

function useContentStyles() {
  const { scale } = useTheme();

  return useMemo(() => ({
    headerWrapper: { paddingTop: scale.scaleSize(22) },
    formContainer: { ...styles.formContainer, marginTop: scale.scaleSize(60), gap: scale.scaleSize(16) },
    field: { width: scale.scaleSize(287) },
    checklist: { marginTop: scale.scaleSize(16), width: scale.scaleSize(287) },
    continueWrapper: { marginTop: scale.scaleSize(20) },
  }), [scale]);
}

type FocusedField = "password" | "confirm" | null;

function useFocusedField() {
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const handlePasswordFocus = useCallback((focused: boolean) => {
    setFocusedField((current) => (focused ? "password" : current === "password" ? null : current));
  }, []);
  const handleConfirmFocus = useCallback((focused: boolean) => {
    setFocusedField((current) => (focused ? "confirm" : current === "confirm" ? null : current));
  }, []);
  return { focusedField, handlePasswordFocus, handleConfirmFocus };
}

function RegisterFormFields({ identity, passwordForm, contentStyles }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  passwordForm: ReturnType<typeof usePasswordForm>;
  contentStyles: ReturnType<typeof useContentStyles>;
}) {
  const appNavigation = useAppNavigation();
  const handleInfoPress = useCallback(() => {
    appNavigation.navigate(Routes.Sheet.IdentityKeyNameNote);
  }, [appNavigation]);
  const { focusedField, handlePasswordFocus, handleConfirmFocus } = useFocusedField();
  const rules = focusedField === "confirm" ? passwordForm.confirmPasswordRules : passwordForm.passwordRules;

  return (
    <>
      <View style={contentStyles.formContainer}>
        <IdentityKeyNameInput identity={identity} onInfoPress={handleInfoPress} style={contentStyles.field} />
        <PasswordInput
          value={passwordForm.password} onChangeText={passwordForm.setPassword}
          placeholder={translate("auth:passwordLabel")} onFocusChange={handlePasswordFocus} style={contentStyles.field}
        />
        <PasswordInput
          value={passwordForm.confirmPassword} onChangeText={passwordForm.setConfirmPassword}
          placeholder={translate("auth:confirmPasswordLabel")} onFocusChange={handleConfirmFocus}
          {...buildConfirmErrorProps(passwordForm.hasConfirmMismatch)} style={contentStyles.field}
        />
      </View>
      {focusedField ? <View style={contentStyles.checklist}><PasswordStrengthChecklist rules={rules} /></View> : null}
    </>
  );
}

function RegisterContent({ identity, passwordForm, onContinue }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  passwordForm: ReturnType<typeof usePasswordForm>;
  onContinue: () => void;
}) {
  const sheetScroll = useSheetScroll();
  const contentStyles = useContentStyles();
  const isIdentityKeyValid = identity.value.trim().length > 0 && !identity.errorMessage;
  const isFormValid = isIdentityKeyValid && (passwordForm.isPasswordFormValid || passwordForm.isPasswordEmpty);

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={styles.page}>
        <View style={contentStyles.headerWrapper}>
          <RegisterHeader
            icon={<RegisterPasswordIcon />}
            title={translate("auth:registerTitle")}
            subtitle={translate("auth:registerSubtitle")}
          />
        </View>
        <RegisterFormFields identity={identity} passwordForm={passwordForm} contentStyles={contentStyles} />
        <View style={contentStyles.continueWrapper}>
          <PrimaryButton label={translate("auth:continueButton")} onPress={onContinue} disabled={!isFormValid} />
        </View>
        <AuthFooter />
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

export function PasswordRegisterScreen() {
  const authNav = useAuthNavigation();
  const { registerAccount, onAuthSuccess } = useAuthActions();
  const identity = useIdentityKeyValidation();
  const passwordForm = usePasswordForm();
  const containerStyle = useContainerStyle();
  const [error, setError] = useState<string | null>(null);

  const handleContinue = useCallback(async () => {
    const isValid = identity.value.trim().length > 0 && !identity.errorMessage;
    const canSubmit = isValid && (passwordForm.isPasswordFormValid || passwordForm.isPasswordEmpty);
    if (!canSubmit) return;
    setError(null);
    const result = await registerAccount({ identityKeyName: identity.value, password: passwordForm.password });
    if (!result) return;
    if (result.outcome === 'authenticated') {
      onAuthSuccess(identity.value);
      authNav.navigate(Routes.Auth.ProfileSetup);
      return;
    }
    if (result.outcome === 'error') setError(result.error.userMessage);
  }, [identity.value, identity.errorMessage, passwordForm.isPasswordFormValid, passwordForm.isPasswordEmpty, passwordForm.password, registerAccount, onAuthSuccess, authNav]);

  return (
    <View style={containerStyle}>
      <RegisterContent identity={identity} passwordForm={passwordForm} onContinue={handleContinue} />
      {error ? <RegisterError message={error} /> : null}
    </View>
  );
}

function RegisterError({ message }: { message: string }) {
  const { colors, scale } = useTheme();
  const style = useMemo(() => ({
    position: "absolute" as const, bottom: scale.scaleSize(80), alignSelf: "center" as const,
    paddingHorizontal: scale.scaleSize(16), paddingVertical: scale.scaleSize(8),
  }), [scale]);

  return <Text variant="caption" color={colors.attentionRed} style={style}>{message}</Text>;
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flexGrow: 1,
    alignItems: "center",
    width: "100%",
  },
  formContainer: {
    alignItems: "center",
  },
});
