import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { translate } from "@ion/localization";
import { useSheetScroll } from "@ion/navigation";
import { TextField } from "@ion/ui";
import { SheetHeader } from "./sheet-header";
import { PrimaryButton } from "./primary-button";
import { RegisterHeader } from "./register-header";
import { RegisterPasswordIcon } from "./register-password-icon";
import { PasswordStrengthChecklist } from "./password-strength-checklist";
import { SecuredByFooter } from "./secured-by-footer";
import { TermsFooter } from "./terms-footer";
import { IdentityKeyIcon } from "./identity-key-icon";
import { PasswordIcon } from "./password-icon";
import { EyeIcon } from "./eye-icon";
import { buildPasswordRules, areAllPasswordRulesMet } from "./password-rules";

interface SetNewPasswordScreenProps {
  identityKeyName: string;
  onBack: () => void;
  onContinue: (password: string) => void;
}

function useSetNewPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isPasswordValid = areAllPasswordRulesMet(password);
  const isPasswordMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = isPasswordValid && isPasswordMatch;

  return {
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, toggleShowPassword: useCallback(() => setShowPassword((v) => !v), []),
    showConfirm, toggleShowConfirm: useCallback(() => setShowConfirm((v) => !v), []),
    isFormValid, isPasswordMatch,
    passwordRules: buildPasswordRules(password),
  };
}

type FormState = ReturnType<typeof useSetNewPasswordForm>;

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
      textInputProps={{ textContentType: "newPassword", autoComplete: "new-password", autoCorrect: false }}
      style={styles.field}
    />
  );
}

function DisabledIdentityKeyField({ identityKeyName }: { identityKeyName: string }) {
  return (
    <TextField
      label={translate("auth:identityKeyNameLabel")}
      value={identityKeyName}
      prefixIcon={<IdentityKeyIcon />}
      hasPrefixDivider
      state="disabled"
      style={styles.field}
    />
  );
}

function FormFields({ form, identityKeyName }: { form: FormState; identityKeyName: string }) {
  return (
    <View style={styles.formContainer}>
      <DisabledIdentityKeyField identityKeyName={identityKeyName} />
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

function ScreenContent({ form, identityKeyName, onContinue }: {
  form: FormState;
  identityKeyName: string;
  onContinue: () => void;
}) {
  const sheetScroll = useSheetScroll();
  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <RegisterHeader
        icon={<RegisterPasswordIcon />}
        title={translate("auth:setNewPasswordTitle")}
        subtitle={translate("auth:setNewPasswordSubtitle")}
      />
      <FormFields form={form} identityKeyName={identityKeyName} />
      <View style={styles.checklist}>
        <PasswordStrengthChecklist
          rules={[...form.passwordRules, { label: translate("auth:passwordsMatchLabel"), isMet: form.isPasswordMatch }]}
        />
      </View>
      <View style={styles.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={onContinue} disabled={!form.isFormValid} />
      </View>
    </BottomSheetScrollView>
  );
}

export function SetNewPasswordScreen({ identityKeyName, onBack, onContinue }: SetNewPasswordScreenProps) {
  const form = useSetNewPasswordForm();

  const handleContinue = useCallback(() => {
    if (!form.isFormValid) return;
    onContinue(form.password);
  }, [form.isFormValid, form.password, onContinue]);

  return (
    <View style={styles.page}>
      <SheetHeader title="" onBack={onBack} />
      <ScreenContent form={form} identityKeyName={identityKeyName} onContinue={handleContinue} />
      <View style={styles.footer}>
        <SecuredByFooter />
        <TermsFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
    width: "100%",
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: 24,
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
    marginTop: "auto",
    alignItems: "center",
    gap: 12,
    paddingBottom: 40,
  },
});
