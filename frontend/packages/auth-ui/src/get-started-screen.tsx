import { StyleSheet, Text, View } from "react-native";
import { Icon, TextField } from "@ion/ui";
import { translate } from "@ion/localization";
import { PrimaryButton } from "./primary-button";
import { SecondaryButton } from "./secondary-button";
import { TextButton } from "./text-button";
import { SecuredByFooter } from "./secured-by-footer";
import { TermsFooter } from "./terms-footer";
import { IceLogoIcon } from "./ice-logo-icon";
import { IdentityKeyIcon } from "./identity-key-icon";
import { InfoIcon } from "./info-icon";
import { CreateAccountIcon } from "./create-account-icon";
import { useIdentityKeyValidation } from "./identity-key-rules";

function GetStartedHeader() {
  return (
    <>
      <View style={styles.iconCircle}>
        <IceLogoIcon />
      </View>
      <Text style={styles.title}>{translate("auth:getStartedTitle")}</Text>
      <Text style={styles.subtitle}>
        {translate("auth:getStartedSubtitle")}
      </Text>
    </>
  );
}

interface GetStartedScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToVerifyPasskey: (identityKeyName: string) => void;
  onNavigateToRestore: () => void;
}

export function GetStartedScreen(props: GetStartedScreenProps) {
  const identity = useIdentityKeyValidation();

  return (
    <View style={styles.page}>
      <GetStartedHeader />
      <TextField
        label={translate("auth:identityKeyNameLabel")}
        value={identity.value}
        onChangeText={identity.setValue}
        prefixIcon={<IdentityKeyIcon />}
        hasPrefixDivider
        suffixIcon={<InfoIcon />}
        {...(identity.errorMessage ? { state: "error" as const, errorMessage: identity.errorMessage } : {})}
        style={styles.field}
      />
      <View style={styles.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={() => identity.validate() && props.onNavigateToVerifyPasskey(identity.value)} />
      </View>
      <Text style={styles.orText}>{translate("auth:orDivider")}</Text>
      <SecondaryButton label={translate("auth:registerButton")} onPress={props.onNavigateToRegister} leftIcon={<CreateAccountIcon />} />
      <TextButton label={translate("auth:restoreIdentityKeyButton")} leftIcon={<Icon name="restore-key" size={24} />} onPress={props.onNavigateToRestore} />
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
  field: {
    width: 287,
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
