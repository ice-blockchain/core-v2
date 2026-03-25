import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SheetHeader } from "./sheet-header";
import { PrimaryButton } from "./primary-button";
import { RegisterForm } from "./register-form";
import { RegisterHeader } from "./register-header";
import { RegisterPasskeyIcon } from "./register-passkey-icon";
import { PasskeyBenefitList } from "./passkey-benefit-list";
import { SecuredByFooter } from "./secured-by-footer";
import { TermsFooter } from "./terms-footer";

interface RegisterScreenProps {
  onBack: () => void;
  onNavigateToVerifyPasskey: (identityKeyName: string) => void;
}

function useRegisterFormState(onNavigateToVerifyPasskey: (name: string) => void) {
  const [isValid, setIsValid] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const identityKeyRef = useRef("");

  return {
    submitted,
    handleValidChange: useCallback((v: boolean) => setIsValid(v), []),
    handleIdentityKeyChange: useCallback((v: string) => { identityKeyRef.current = v; }, []),
    handleContinue: useCallback(() => {
      setSubmitted(true);
      if (isValid) onNavigateToVerifyPasskey(identityKeyRef.current);
    }, [isValid, onNavigateToVerifyPasskey]),
  };
}

export function RegisterScreen({ onBack, onNavigateToVerifyPasskey }: RegisterScreenProps) {
  const form = useRegisterFormState(onNavigateToVerifyPasskey);

  return (
    <View style={styles.page}>
      <SheetHeader title="" onBack={onBack} />
      <RegisterHeader icon={<RegisterPasskeyIcon />} title="Register with a passkey" />
      <PasskeyBenefitList />
      <RegisterForm
        onValidChange={form.handleValidChange}
        onIdentityKeyChange={form.handleIdentityKeyChange}
        submitted={form.submitted}
      />
      <View style={styles.continueWrapper}>
        <PrimaryButton label="Continue" onPress={form.handleContinue} />
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
    flex: 1,
    alignItems: "center",
    width: "100%",
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
