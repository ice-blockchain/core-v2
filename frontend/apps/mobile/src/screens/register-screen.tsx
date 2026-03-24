import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SheetHeader } from "../components/sheet-header";
import { PrimaryButton } from "../components/primary-button";
import { RegisterForm } from "../components/register-form";
import { RegisterHeader } from "../components/register-header";
import { SecuredByFooter } from "../components/secured-by-footer";
import { TermsFooter } from "../components/terms-footer";

interface RegisterScreenProps {
  onBack: () => void;
  onNavigateToVerifyPasskey: () => void;
}

export function RegisterScreen(props: RegisterScreenProps) {
  const [isValid, setIsValid] = useState(false);
  const handleValidChange = useCallback((v: boolean) => setIsValid(v), []);

  return (
    <View style={styles.page}>
      <SheetHeader title="" onBack={props.onBack} />
      <RegisterHeader />
      <RegisterForm onValidChange={handleValidChange} />
      <View style={styles.continueWrapper}>
        <PrimaryButton
          label="Continue"
          onPress={() => isValid && props.onNavigateToVerifyPasskey()}
        />
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
