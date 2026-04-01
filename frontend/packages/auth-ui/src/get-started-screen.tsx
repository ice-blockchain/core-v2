import { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Icon, TextField, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
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

function useGetStartedNavigation() {
  const navigation = useAuthNavigation();

  return {
    handleRegister: useCallback(() => {
      navigation.navigate(Routes.Auth.Register);
    }, [navigation]),
    handleVerifyPassword: useCallback(() => {
      navigation.navigate(Routes.Auth.ProfileSetup);
    }, [navigation]),
    handleRestore: useCallback(() => {
      navigation.navigate(Routes.Auth.ProfileSetup);
    }, [navigation]),
  };
}

function GetStartedActions({ identity, nav }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  nav: ReturnType<typeof useGetStartedNavigation>;
}) {
  const handleContinue = useCallback(() => {
    if (identity.validate()) { nav.handleVerifyPassword(); }
  }, [identity, nav]);

  return (
    <>
      <View style={styles.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={handleContinue} />
      </View>
      <Text style={styles.orText}>{translate("auth:orDivider")}</Text>
      <SecondaryButton label={translate("auth:registerButton")} onPress={nav.handleRegister} leftIcon={<CreateAccountIcon />} />
      <TextButton label={translate("auth:restoreIdentityKeyButton")} leftIcon={<Icon name="restore-key" size={24} />} onPress={nav.handleRestore} />
    </>
  );
}

function GetStartedContent({ identity, nav }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  nav: ReturnType<typeof useGetStartedNavigation>;
}) {
  const sheetScroll = useSheetScroll();

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
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
        <GetStartedActions identity={identity} nav={nav} />
        <View style={styles.footer}>
          <SecuredByFooter />
          <TermsFooter />
        </View>
      </View>
    </BottomSheetScrollView>
  );
}

function useContainerStyle() {
  const theme = useTheme();
  return useMemo(
    () => ({ flex: 1 as const, backgroundColor: theme.colors.secondaryBackground }),
    [theme.colors],
  );
}

export function GetStartedScreen() {
  const nav = useGetStartedNavigation();
  const identity = useIdentityKeyValidation();
  const containerStyle = useContainerStyle();

  return (
    <View style={containerStyle}>
      <GetStartedContent identity={identity} nav={nav} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
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
