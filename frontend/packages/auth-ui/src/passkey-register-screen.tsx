import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Button, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAppNavigation, useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
import { RegisterHeader } from "./register-header";
import { RegisterPasskeyIcon } from "./register-passkey-icon";
import { PasskeyBenefitList } from "./passkey-benefit-list";
import { IdentityKeyNameInput } from "./identity-key-name-input";
import { useIdentityKeyValidation } from "./identity-key-rules";
import { ArrowIcon } from "./arrow-icon";
import { useAuthActions } from "./auth-actions-context";
import { isInlineAuthError } from "./is-inline-error";

function PasskeyRegisterContent({ identity, onContinue, isLoading }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  onContinue: () => void;
  isLoading: boolean;
}) {
  const sheetScroll = useSheetScroll();
  const theme = useTheme();
  const { scaleSize } = theme.scale;
  const pageStyle = useMemo(() => ({ ...styles.page, paddingHorizontal: scaleSize(44) }), [scaleSize]);
  const inputStyle = useMemo(() => ({ marginTop: scaleSize(44), alignSelf: "stretch" as const }), [scaleSize]);
  const continueStyle = useMemo(() => ({ marginTop: scaleSize(20), alignSelf: "stretch" as const }), [scaleSize]);
  const arrowIcon = <ArrowIcon size={15} color={theme.colors.onPrimaryAccent} />;

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
      <View style={pageStyle}>
        <RegisterHeader icon={<RegisterPasskeyIcon />} title={translate("auth:passkeyRegisterTitle")} />
        <PasskeyBenefitList />
        <View style={inputStyle}>
          <IdentityKeyNameInput identity={identity} />
        </View>
        <View style={continueStyle}>
          <Button label={translate("auth:continueButton")} icon={arrowIcon} iconPosition="right" onPress={onContinue} isLoading={isLoading} isDisabled={isLoading} />
        </View>
      </View>
    </BottomSheetScrollView>
  );
}

function usePasskeyRegister(identity: ReturnType<typeof useIdentityKeyValidation>) {
  const authNav = useAuthNavigation();
  const appNavigation = useAppNavigation();
  const { registerAccount, onAuthSuccess, isRegisterLoading } = useAuthActions();

  const handleContinue = useCallback(async () => {
    if (!identity.validate()) return;
    const result = await registerAccount({ identityKeyName: identity.value });
    handleRegisterResult(result, { identity, authNav, appNavigation, onAuthSuccess });
  }, [identity, registerAccount, onAuthSuccess, authNav, appNavigation]);

  return { handleContinue, isLoading: isRegisterLoading };
}

function handleRegisterResult(
  result: Awaited<ReturnType<ReturnType<typeof useAuthActions>['registerAccount']>>,
  ctx: { identity: ReturnType<typeof useIdentityKeyValidation>; authNav: ReturnType<typeof useAuthNavigation>; appNavigation: ReturnType<typeof useAppNavigation>; onAuthSuccess: (u: string) => void },
): void {
  if (!result) return;
  if (result.outcome === 'authenticated') {
    ctx.onAuthSuccess(ctx.identity.value);
    ctx.authNav.navigate(Routes.Auth.ProfileSetup);
    return;
  }
  if (result.outcome === 'error') {
    if (isInlineAuthError(result.error.code)) {
      ctx.identity.setServerError(result.error.userMessage);
    } else {
      ctx.appNavigation.navigate(Routes.Sheet.GeneralError, { errorCode: result.error.numericCode });
    }
  }
}

export function PasskeyRegisterScreen() {
  const identity = useIdentityKeyValidation();
  const theme = useTheme();
  const { handleContinue, isLoading } = usePasskeyRegister(identity);

  const containerStyle = useMemo(
    () => ({ flex: 1 as const, backgroundColor: theme.colors.secondaryBackground }),
    [theme.colors],
  );

  return (
    <View style={containerStyle}>
      <PasskeyRegisterContent identity={identity} onContinue={handleContinue} isLoading={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
  },
});
