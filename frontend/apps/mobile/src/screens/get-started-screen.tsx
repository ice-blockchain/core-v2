import { StyleSheet, Text, View } from "react-native";
import { FormInput } from "../components/form-input";
import { PrimaryButton } from "../components/primary-button";
import { SecondaryButton } from "../components/secondary-button";
import { TextButton } from "../components/text-button";
import { SecuredByFooter } from "../components/secured-by-footer";
import { TermsFooter } from "../components/terms-footer";
import { IceLogoIcon } from "../components/ice-logo-icon";
import { IdentityKeyIcon } from "../components/identity-key-icon";
import { InfoIcon } from "../components/info-icon";
import { CreateAccountIcon } from "../components/create-account-icon";
import { RestoreKeyIcon } from "../components/restore-key-icon";
import { useIdentityKeyValidation } from "../components/identity-key-rules";

function GetStartedHeader() {
  return (
    <>
      <View style={styles.iconCircle}>
        <IceLogoIcon />
      </View>
      <Text style={styles.title}>Get started</Text>
      <Text style={styles.subtitle}>
        Enter your identity key name to log in into your account
      </Text>
    </>
  );
}

interface GetStartedScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToVerifyPasskey: () => void;
}

export function GetStartedScreen(props: GetStartedScreenProps) {
  const identity = useIdentityKeyValidation();

  return (
    <View style={styles.page}>
      <GetStartedHeader />
      <FormInput
        placeholder="Identity key name"
        value={identity.value}
        onChange={identity.setValue}
        leftIcon={<IdentityKeyIcon />}
        rightIcon={<InfoIcon />}
        errorMessage={identity.errorMessage}
      />
      <View style={styles.continueWrapper}>
        <PrimaryButton label="Continue" onPress={() => identity.validate() && props.onNavigateToVerifyPasskey()} />
      </View>
      <Text style={styles.orText}>or</Text>
      <SecondaryButton label="Register" onPress={props.onNavigateToRegister} leftIcon={<CreateAccountIcon />} />
      <TextButton label="Restore identity key" leftIcon={<RestoreKeyIcon />} />
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
    paddingTop: 50,
  },
  iconCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#0166FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontWeight: "700",
    fontSize: 28,
    color: "#0E0E0E",
    marginBottom: 8,
  },
  subtitle: {
    fontWeight: "400",
    fontSize: 13,
    color: "#9A9A9A",
    textAlign: "center",
    maxWidth: 320,
    marginBottom: 40,
  },
  continueWrapper: {
    marginTop: 16,
  },
  orText: {
    fontWeight: "500",
    fontSize: 12,
    color: "#9A9A9A",
    marginVertical: 16,
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
    gap: 12,
    paddingBottom: 40,
  },
});
