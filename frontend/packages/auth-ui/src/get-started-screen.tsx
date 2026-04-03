import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAppNavigation, useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
import { PrimaryButton } from "./primary-button";
import { SecondaryButton } from "./secondary-button";
import { TextButton } from "./text-button";
import { SecuredByFooter } from "./secured-by-footer";
import { TermsFooter } from "./terms-footer";
import { IceLogoIcon } from "./ice-logo-icon";
import { CreateAccountIcon } from "./create-account-icon";
import { IdentityKeyNameInput } from "./identity-key-name-input";
import { useIdentityKeyValidation } from "./identity-key-rules";

function GetStartedHeader() {
  const { colors } = useTheme();

  const iconCircleStyle = useMemo(() => ({
    ...styles.iconCircle,
    backgroundColor: colors.primaryAccent,
  }), [colors.primaryAccent]);

  return (
    <>
      <View style={iconCircleStyle}>
        <IceLogoIcon />
      </View>
      <Text variant="headline1" color={colors.primaryText}>{translate("auth:getStartedTitle")}</Text>
      <Text variant="body2" color={colors.tertiaryText} style={styles.subtitle}>
        {translate("auth:getStartedSubtitle")}
      </Text>
    </>
  );
}

function useGetStartedNavigation() {
  const navigation = useAuthNavigation();

  return {
    handleRegister: useCallback(() => {
      navigation.navigate(Routes.Auth.PasswordRegister);
    }, [navigation]),
    // TODO: wire to actual password verification before navigating
    handleVerifyPassword: useCallback(() => {
      navigation.navigate(Routes.Auth.ProfileSetup);
    }, [navigation]),
    // TODO: wire to actual credential restore before navigating
    handleRestore: useCallback(() => {
      navigation.navigate(Routes.Auth.ProfileSetup);
    }, [navigation]),
  };
}

function GetStartedActions({ identity, nav }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  nav: ReturnType<typeof useGetStartedNavigation>;
}) {
  const { colors } = useTheme();
  const handleContinue = useCallback(() => {
    if (identity.validate()) { nav.handleVerifyPassword(); }
  }, [identity, nav]);

  return (
    <>
      <View style={styles.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={handleContinue} />
      </View>
      <Text variant="caption" color={colors.tertiaryText} style={styles.orText}>{translate("auth:orDivider")}</Text>
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
  const appNavigation = useAppNavigation();
  const handleInfoPress = useCallback(() => {
    appNavigation.navigate(Routes.Sheet.IdentityKeyNameNote);
  }, [appNavigation]);

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
      <View style={styles.page}>
        <GetStartedHeader />
        <IdentityKeyNameInput identity={identity} onInfoPress={handleInfoPress} style={styles.field} />
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  subtitle: {
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
    marginVertical: 16,
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
    gap: 12,
    paddingBottom: 40,
  },
});
