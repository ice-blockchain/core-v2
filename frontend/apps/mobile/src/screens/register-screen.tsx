import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SheetHeader } from "../components/sheet-header";
import { PrimaryButton } from "../components/primary-button";
import { RegisterForm } from "../components/register-form";
import { RegisterHeader } from "../components/register-header";
import { RegisterPasskeyIcon } from "../components/register-passkey-icon";
import { PasskeyBenefitList } from "../components/passkey-benefit-list";
import { SecuredByFooter } from "../components/secured-by-footer";
import { TermsFooter } from "../components/terms-footer";

interface RegisterScreenProps {
  onBack: () => void;
  onNavigateToVerifyPasskey: (identityKeyName: string) => void;
}

export function RegisterScreen({ onBack, onNavigateToVerifyPasskey }: RegisterScreenProps) {
  const [isValid, setIsValid] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const identityKeyRef = useRef("");
  const handleValidChange = useCallback((v: boolean) => setIsValid(v), []);
  const handleIdentityKeyChange = useCallback((v: string) => { identityKeyRef.current = v; }, []);

  const handleContinue = useCallback(() => {
    setSubmitted(true);
    if (isValid) onNavigateToVerifyPasskey(identityKeyRef.current);
  }, [isValid, onNavigateToVerifyPasskey]);

  return (
    <View style={styles.page}>
      <SheetHeader title="" onBack={onBack} />
      <RegisterHeader
        icon={<RegisterPasskeyIcon />}
        title="Register with a passkey"
      />
      <PasskeyBenefitList />
      <RegisterForm
        onValidChange={handleValidChange}
        onIdentityKeyChange={handleIdentityKeyChange}
        submitted={submitted}
      />
      <View style={styles.continueWrapper}>
        <PrimaryButton label="Continue" onPress={handleContinue} />
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
