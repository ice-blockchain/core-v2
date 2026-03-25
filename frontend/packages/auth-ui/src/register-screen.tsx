import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SheetHeader } from "./sheet-header";
import { PrimaryButton } from "./primary-button";
import { FormInput } from "./form-input";
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

interface RegisterScreenProps {
  onBack: () => void;
  onContinue: (data: { identityKeyName: string; password: string }) => void;
}

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
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}

function PasswordField({ placeholder, value, onChange, show, onToggle }: PasswordFieldProps) {
  return (
    <FormInput
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      leftIcon={<PasswordIcon />}
      rightIcon={<EyeIcon isOff={!show} />}
      onRightIconPress={onToggle}
      secureTextEntry={!show}
    />
  );
}

function RegisterFormFields({ form }: { form: FormState }) {
  return (
    <View style={styles.formContainer}>
      <FormInput
        placeholder="Identity key name"
        value={form.identityKeyName}
        onChange={form.setIdentityKeyName}
        leftIcon={<IdentityKeyIcon />}
        rightIcon={<InfoIcon />}
        errorMessage={form.identityKeyError}
      />
      <PasswordField
        placeholder="Password"
        value={form.password}
        onChange={form.setPassword}
        show={form.showPassword}
        onToggle={form.toggleShowPassword}
      />
      <PasswordField
        placeholder="Confirm password"
        value={form.confirmPassword}
        onChange={form.setConfirmPassword}
        show={form.showConfirm}
        onToggle={form.toggleShowConfirm}
      />
    </View>
  );
}

export function RegisterScreen({ onBack, onContinue }: RegisterScreenProps) {
  const form = useRegisterPasswordForm();

  const handleContinue = useCallback(() => {
    if (!form.isFormValid) return;
    onContinue({ identityKeyName: form.identityKeyName, password: form.password });
  }, [form.isFormValid, form.identityKeyName, form.password, onContinue]);

  return (
    <View style={styles.page}>
      <SheetHeader title="" onBack={onBack} />
      <RegisterHeader
        icon={<RegisterPasswordIcon />}
        title="Register"
        subtitle="Choose a strong password to create an account"
      />
      <RegisterFormFields form={form} />
      <View style={styles.checklist}>
        <PasswordStrengthChecklist
          rules={[...form.passwordRules, { label: "Passwords match", isMet: form.isPasswordMatch }]}
        />
      </View>
      <View style={styles.continueWrapper}>
        <PrimaryButton label="Continue" onPress={handleContinue} disabled={!form.isFormValid} />
      </View>
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
  formContainer: {
    marginTop: 24,
    gap: 16,
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
