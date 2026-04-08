import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { CommonActions } from "@react-navigation/native";
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
import { RegisterHeader } from "./register-header";
import { IdentityKeyNameInput } from "./identity-key-name-input";
import { useIdentityKeyValidation } from "./identity-key-rules";
import { useAuthActions } from "./auth-actions-context";
import type { AuthActions } from "./auth-actions-context";
import { isInlineAuthError } from "./is-inline-error";

function useGetStartedNavigation() {
  const navigation = useAuthNavigation();
  const { isPasskeyAvailable } = useAuthActions();

  return {
    handleRegister: useCallback(() => {
      const route = isPasskeyAvailable()
        ? Routes.Auth.PasskeyRegister
        : Routes.Auth.PasswordRegister;
      navigation.navigate(route);
    }, [navigation, isPasskeyAvailable]),
    handleRestore: useCallback(() => {
      navigation.navigate(Routes.Auth.RestoreIdentity);
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

interface LoginResultContext {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  navigation: ReturnType<typeof useAppNavigation>;
  onAuthSuccess: (username: string) => void;
}

function handleLoginResult(
  result: Awaited<ReturnType<AuthActions['attemptLogin']>>,
  ctx: LoginResultContext,
): void {
  if (!result) return;
  if (result.outcome === 'authenticated') {
    ctx.onAuthSuccess(ctx.identity.value);
    const resetAction = CommonActions.reset({ index: 0, routes: [{ name: Routes.Main }] }) as unknown as { type: string; payload: object };
    ctx.navigation.dispatch(resetAction);
    return;
  }
  if (result.outcome === 'needs-password') {
    ctx.navigation.navigate(Routes.Sheet.Verify, {
      next: { name: Routes.Main, reset: true },
      method: "Password",
      identityKeyName: result.identityKeyName,
    });
    return;
  }
  if (isInlineAuthError(result.error.code)) {
    ctx.identity.setServerError(result.error.userMessage);
  } else {
    ctx.navigation.navigate(Routes.Sheet.GeneralError, { errorCode: result.error.numericCode });
  }
}

function useHandleContinue(identity: ReturnType<typeof useIdentityKeyValidation>) {
  const appNavigation = useAppNavigation();
  const { attemptLogin, onAuthSuccess, isLoginAttemptLoading } = useAuthActions();

  const handleContinue = useCallback(async () => {
    if (!identity.validate()) return;
    const result = await attemptLogin(identity.value);
    handleLoginResult(result, { identity, navigation: appNavigation, onAuthSuccess });
  }, [identity, appNavigation, attemptLogin, onAuthSuccess]);

  return { handleContinue, isLoading: isLoginAttemptLoading };
}

function GetStartedActions({ identity, nav }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  nav: ReturnType<typeof useGetStartedNavigation>;
}) {
  const { colors } = useTheme();
  const actionStyles = useActionStyles();
  const { handleContinue, isLoading } = useHandleContinue(identity);

  return (
    <>
      <View style={actionStyles.continueWrapper}>
        <PrimaryButton label={translate("auth:continueButton")} onPress={handleContinue} loading={isLoading} />
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
    headerWrapper: { marginBottom: scale.scaleSize(56) },
  }), [scale]);
}

function GetStartedContent({ identity, nav }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  nav: ReturnType<typeof useGetStartedNavigation>;
}) {
  const sheetScroll = useSheetScroll();
  const contentStyles = useContentStyles();

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={contentStyles.page}>
        <View style={contentStyles.headerWrapper}>
          <RegisterHeader
            icon={<IceLogoIcon />}
            title={translate("auth:getStartedTitle")}
            subtitle={translate("auth:getStartedSubtitle")}
          />
        </View>
        <IdentityKeyNameInput identity={identity} style={contentStyles.field} />
        <GetStartedActions identity={identity} nav={nav} />
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

  return (
    <View style={containerStyle}>
      <GetStartedContent identity={identity} nav={nav} />
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
});
