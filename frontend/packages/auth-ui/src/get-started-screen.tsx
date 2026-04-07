import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAppNavigation, useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
import { PrimaryButton } from "./primary-button";
import { SecondaryButton } from "./secondary-button";
import { TextButton } from "./text-button";
import { AuthFooter } from "./auth-footer";
import { IceLogoIcon } from "./ice-logo-icon";
import { CreateAccountIcon } from "./create-account-icon";
import { IdentityKeyNameInput } from "./identity-key-name-input";
import { useIdentityKeyValidation } from "./identity-key-rules";
import { useAuthActions } from "./auth-actions-context";

function useHeaderStyles() {
  const { colors, scale } = useTheme();

  return useMemo(() => ({
    iconCircle: {
      ...styles.iconCircle,
      width: scale.scaleSize(65),
      height: scale.scaleSize(65),
      borderRadius: scale.scaleRadius(32.5),
      marginBottom: scale.scaleSize(20),
      backgroundColor: colors.primaryAccent,
    },
    subtitle: {
      ...styles.subtitle,
      maxWidth: scale.scaleSize(320),
      marginTop: scale.scaleSize(8),
      marginBottom: scale.scaleSize(56),
    },
    logoWidth: scale.scaleSize(44),
    logoHeight: scale.scaleSize(45),
  }), [colors.primaryAccent, scale]);
}

function GetStartedHeader() {
  const { colors } = useTheme();
  const headerStyles = useHeaderStyles();

  return (
    <>
      <View style={headerStyles.iconCircle}>
        <IceLogoIcon width={headerStyles.logoWidth} height={headerStyles.logoHeight} />
      </View>
      <Text variant="headline1" color={colors.primaryText}>{translate("auth:getStartedTitle")}</Text>
      <Text variant="body2" color={colors.tertiaryText} style={headerStyles.subtitle}>
        {translate("auth:getStartedSubtitle")}
      </Text>
    </>
  );
}

function useGetStartedNavigation() {
  const navigation = useAuthNavigation();

  return {
    handleRegister: useCallback(() => {
      const route = Date.now() % 2 === 0
        ? Routes.Auth.PasswordRegister
        : Routes.Auth.PasskeyRegister;
      navigation.navigate(route);
    }, [navigation]),
    handleVerifyPassword: useCallback(() => {
      navigation.navigate(Routes.Auth.ProfileSetup);
    }, [navigation]),
    handleRestore: useCallback(() => {
      navigation.navigate(Routes.Auth.ProfileSetup);
    }, [navigation]),
  };
}

function useActionStyles() {
  const { scale } = useTheme();

  return useMemo(() => ({
    continueWrapper: { marginTop: scale.scaleSize(16) },
    orText: { marginVertical: scale.scaleSize(14) },
    restoreWrapper: { marginTop: scale.scaleSize(16) },
    iconSize: scale.scaleSize(24),
  }), [scale]);
}

function useHandleContinue(
  identity: ReturnType<typeof useIdentityKeyValidation>,
  setError: (error: string | null) => void,
) {
  const appNavigation = useAppNavigation();
  const { attemptLogin, onAuthSuccess } = useAuthActions();

  return useCallback(async () => {
    if (!identity.validate()) return;
    setError(null);
    const result = await attemptLogin(identity.value);
    if (!result) return;
    if (result.outcome === 'authenticated') {
      onAuthSuccess(identity.value);
      return;
    }
    if (result.outcome === 'needs-password') {
      appNavigation.navigate(Routes.Sheet.Verify, {
        next: { name: Routes.Main, reset: true },
        method: "Password",
        identityKeyName: result.identityKeyName,
      });
      return;
    }
    setError(result.error.userMessage);
  }, [identity, appNavigation, attemptLogin, onAuthSuccess, setError]);
}

function GetStartedActions({ identity, nav, setError }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  nav: ReturnType<typeof useGetStartedNavigation>;
  setError: (error: string | null) => void;
}) {
  const { colors } = useTheme();
  const actionStyles = useActionStyles();
  const handleContinue = useHandleContinue(identity, setError);

  return (
    <>
      <View style={actionStyles.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={handleContinue} />
      </View>
      <Text variant="caption" color={colors.tertiaryText} style={actionStyles.orText}>
        {translate("auth:orDivider")}
      </Text>
      <SecondaryButton
        label={translate("auth:registerButton")} onPress={nav.handleRegister}
        leftIcon={<CreateAccountIcon color={colors.secondaryText} size={actionStyles.iconSize} />}
      />
      <View style={actionStyles.restoreWrapper}>
        <TextButton
          label={translate("auth:restoreIdentityKeyButton")} onPress={nav.handleRestore}
          leftIcon={<Icon name="restore-key" size={actionStyles.iconSize} color={colors.secondaryText} />}
        />
      </View>
    </>
  );
}

function useContentStyles() {
  const { scale } = useTheme();

  return useMemo(() => ({
    page: { ...styles.page, paddingTop: scale.scaleSize(5) },
    field: { width: scale.scaleSize(287) },
  }), [scale]);
}

function GetStartedContent({ identity, nav, setError, error }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  nav: ReturnType<typeof useGetStartedNavigation>;
  setError: (error: string | null) => void;
  error: string | null;
}) {
  const sheetScroll = useSheetScroll();
  const appNavigation = useAppNavigation();
  const { colors, scale } = useTheme();
  const contentStyles = useContentStyles();
  const handleInfoPress = useCallback(() => {
    appNavigation.navigate(Routes.Sheet.IdentityKeyNameNote);
  }, [appNavigation]);
  const errorStyle = useMemo(() => ({ marginTop: scale.scaleSize(8) }), [scale]);

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={contentStyles.page}>
        <GetStartedHeader />
        <IdentityKeyNameInput identity={identity} onInfoPress={handleInfoPress} style={contentStyles.field} />
        {error ? <Text variant="caption" color={colors.attentionRed} style={errorStyle}>{error}</Text> : null}
        <GetStartedActions identity={identity} nav={nav} setError={setError} />
        <AuthFooter />
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
  const [error, setError] = useState<string | null>(null);

  return (
    <View style={containerStyle}>
      <GetStartedContent identity={identity} nav={nav} setError={setError} error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flexGrow: 1,
    alignItems: "center",
    width: "100%",
  },
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    textAlign: "center",
  },
});
