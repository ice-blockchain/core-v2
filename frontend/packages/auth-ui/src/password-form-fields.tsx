import { useCallback, useState } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { translate } from "@ion/localization";
import { IdentityKeyNameInput } from "./identity-key-name-input";
import type { useIdentityKeyValidation } from "./identity-key-rules";
import { PasswordInput } from "./password-input";
import { PasswordStrengthChecklist } from "./password-strength-checklist";
import type { usePasswordForm } from "./use-password-form";

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

function buildConfirmErrorProps(hasConfirmMismatch: boolean) {
  if (!hasConfirmMismatch) return {};
  return { state: "error" as const, errorMessage: translate("auth:passwordMismatchError") };
}

interface PasswordFormFieldsStyles {
  formContainer: StyleProp<ViewStyle>;
  field: StyleProp<ViewStyle>;
  checklist: StyleProp<ViewStyle>;
}

interface PasswordFormFieldsProps {
  passwordForm: ReturnType<typeof usePasswordForm>;
  styles: PasswordFormFieldsStyles;
  identity: ReturnType<typeof useIdentityKeyValidation>;
}

export function PasswordFormFields({ passwordForm, styles, identity }: PasswordFormFieldsProps) {
  const { focusedField, handlePasswordFocus, handleConfirmFocus } = useFocusedField();
  const rules = focusedField === "confirm" ? passwordForm.confirmPasswordRules : passwordForm.passwordRules;

  return (
    <>
      <View style={styles.formContainer}>
        <IdentityKeyNameInput identity={identity} style={styles.field} />
        <PasswordInput
          value={passwordForm.password} onChangeText={passwordForm.setPassword}
          placeholder={translate("auth:passwordLabel")} onFocusChange={handlePasswordFocus} style={styles.field}
        />
        <PasswordInput
          value={passwordForm.confirmPassword} onChangeText={passwordForm.setConfirmPassword}
          placeholder={translate("auth:confirmPasswordLabel")} onFocusChange={handleConfirmFocus}
          {...buildConfirmErrorProps(passwordForm.hasConfirmMismatch)} style={styles.field}
        />
      </View>
      {focusedField ? <View style={styles.checklist}><PasswordStrengthChecklist rules={rules} /></View> : null}
    </>
  );
}
