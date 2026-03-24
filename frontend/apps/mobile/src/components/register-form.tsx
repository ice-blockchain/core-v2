import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { FormInput } from "./form-input";
import { PasswordStrengthChecklist } from "./password-strength-checklist";
import { IdentityKeyIcon } from "./identity-key-icon";
import { InfoIcon } from "./info-icon";
import { PasswordIcon } from "./password-icon";
import { EyeIcon } from "./eye-icon";
import { buildPasswordRules, areAllPasswordRulesMet } from "./password-rules";

function PasswordField(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <FormInput
      placeholder={props.placeholder}
      value={props.value}
      onChange={props.onChange}
      leftIcon={<PasswordIcon />}
      secureTextEntry={!props.show}
      rightIcon={<EyeIcon isOff={!props.show} />}
      onRightIconPress={props.onToggle}
    />
  );
}

function IdentityKeyField(props: { value: string; onChange: (v: string) => void }) {
  return (
    <FormInput
      placeholder="Identity key name"
      value={props.value}
      onChange={props.onChange}
      leftIcon={<IdentityKeyIcon />}
      rightIcon={<InfoIcon />}
    />
  );
}

function useRegisterFormState(onValidChange: (v: boolean) => void) {
  const [identityKeyName, setIdentityKeyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const rules = useMemo(() => buildPasswordRules(password), [password]);
  const isValid = Boolean(identityKeyName.trim())
    && areAllPasswordRulesMet(password)
    && password === confirmPassword;

  useEffect(() => { onValidChange(isValid); }, [isValid, onValidChange]);

  return {
    identityKeyName, setIdentityKeyName,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    showConfirm, setShowConfirm,
    rules,
  };
}

interface RegisterFormProps {
  onValidChange: (isValid: boolean) => void;
}

export function RegisterForm({ onValidChange }: RegisterFormProps) {
  const s = useRegisterFormState(onValidChange);

  return (
    <>
      <View style={styles.form}>
        <IdentityKeyField value={s.identityKeyName} onChange={s.setIdentityKeyName} />
        <PasswordField
          placeholder="Password" value={s.password} onChange={s.setPassword}
          show={s.showPassword} onToggle={() => s.setShowPassword((v) => !v)}
        />
        <PasswordField
          placeholder="Confirm password" value={s.confirmPassword} onChange={s.setConfirmPassword}
          show={s.showConfirm} onToggle={() => s.setShowConfirm((v) => !v)}
        />
      </View>
      {s.password.length > 0 && (
        <View style={styles.checklist}>
          <PasswordStrengthChecklist rules={s.rules} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
    marginTop: 24,
  },
  checklist: {
    marginTop: 8,
  },
});
