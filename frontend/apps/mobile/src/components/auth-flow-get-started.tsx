import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import {
  PrimaryButton, SecondaryButton, TextButton,
  IdentityKeyNameInput, useIdentityKeyValidation,
  IceLogoIcon, CreateAccountIcon, SecuredByFooter, TermsFooter,
} from "@ion/auth-ui";
import type { GetStartedCallbacks } from "@ion/auth";

interface AuthFlowGetStartedProps {
  callbacks: GetStartedCallbacks;
}

export function AuthFlowGetStarted({ callbacks }: AuthFlowGetStartedProps) {
  const { colors } = useTheme();
  const identity = useIdentityKeyValidation(callbacks.initialIdentityKeyName);

  const iconCircleStyle = useMemo(() => ({
    ...styles.iconCircle,
    backgroundColor: colors.primaryAccent,
  }), [colors.primaryAccent]);

  const handleContinue = useCallback(() => {
    if (identity.validate()) {
      callbacks.onNavigateToVerifyPassword(identity.value);
    }
  }, [identity, callbacks]);

  return (
    <View style={styles.page}>
      <View style={iconCircleStyle}>
        <IceLogoIcon />
      </View>
      <Text variant="headline1" color={colors.primaryText}>{translate("auth:getStartedTitle")}</Text>
      <Text variant="body2" color={colors.tertiaryText} style={styles.subtitle}>
        {translate("auth:getStartedSubtitle")}
      </Text>
      <IdentityKeyNameInput identity={identity} style={styles.field} />
      <View style={styles.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={handleContinue} />
      </View>
      <Text variant="caption" color={colors.tertiaryText} style={styles.orText}>{translate("auth:orDivider")}</Text>
      <SecondaryButton label={translate("auth:registerButton")} onPress={callbacks.onNavigateToRegister} leftIcon={<CreateAccountIcon />} />
      <TextButton
        label={translate("auth:restoreIdentityKeyButton")}
        leftIcon={<Icon name="restore-key" size={24} />}
        onPress={callbacks.onNavigateToRestore}
      />
      <View style={styles.footer}>
        <SecuredByFooter />
        <TermsFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: "center", width: "100%", paddingTop: 50 },
  iconCircle: { width: 65, height: 65, borderRadius: 32.5, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  subtitle: { textAlign: "center", maxWidth: 320, marginBottom: 40 },
  field: { width: 287 },
  continueWrapper: { marginTop: 16 },
  orText: { marginVertical: 16 },
  footer: { marginTop: "auto", alignItems: "center", gap: 12, paddingBottom: 40 },
});
