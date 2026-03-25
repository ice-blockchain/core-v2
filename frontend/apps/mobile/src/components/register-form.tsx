import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { FormInput } from "./form-input";
import { IdentityKeyIcon } from "./identity-key-icon";
import { InfoIcon } from "./info-icon";
import { validateIdentityKeyName } from "./identity-key-rules";

function useIdentityKeyFormState(onValidChange: (v: boolean) => void) {
  const [identityKeyName, setIdentityKeyName] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValid = Boolean(identityKeyName.trim())
    && !validateIdentityKeyName(identityKeyName);

  useEffect(() => { onValidChange(isValid); }, [isValid, onValidChange]);

  const errorMessage = useMemo(() => {
    if (!touched && !submitted) return null;
    if (identityKeyName.length === 0) return submitted ? "Enter identity key name" : null;
    return validateIdentityKeyName(identityKeyName);
  }, [identityKeyName, touched, submitted]);

  const markSubmitted = useCallback(() => setSubmitted(true), []);

  return {
    identityKeyName,
    setIdentityKeyName,
    errorMessage,
    setTouched,
    markSubmitted,
  };
}

interface RegisterFormProps {
  onValidChange: (isValid: boolean) => void;
  onIdentityKeyChange: (value: string) => void;
  submitted: boolean;
}

export function RegisterForm({ onValidChange, onIdentityKeyChange, submitted }: RegisterFormProps) {
  const state = useIdentityKeyFormState(onValidChange);

  const { markSubmitted, identityKeyName } = state;
  useEffect(() => { if (submitted) markSubmitted(); }, [submitted, markSubmitted]);
  useEffect(() => { onIdentityKeyChange(identityKeyName); }, [identityKeyName, onIdentityKeyChange]);

  return (
    <View style={styles.form}>
      <FormInput
        placeholder="Identity key name"
        value={state.identityKeyName}
        onChange={state.setIdentityKeyName}
        leftIcon={<IdentityKeyIcon />}
        rightIcon={<InfoIcon />}
        errorMessage={state.errorMessage}
        onBlur={() => state.setTouched(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: 24,
  },
});
