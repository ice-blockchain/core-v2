import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Button, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAppNavigation, useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
import { RegisterHeader } from "./register-header";
import { RegisterPasskeyIcon } from "./register-passkey-icon";
import { PasskeyBenefitList } from "./passkey-benefit-list";
import { IdentityKeyNameInput } from "./identity-key-name-input";
import { useIdentityKeyValidation } from "./identity-key-rules";
import { ArrowIcon } from "./arrow-icon";
import { useAuthActions } from "./auth-actions-context";

function PasskeyRegisterContent({ identity, onContinue }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  onContinue: () => void;
}) {
  const sheetScroll = useSheetScroll();
  const appNavigation = useAppNavigation();
  const handleInfoPress = useCallback(() => {
    appNavigation.navigate(Routes.Sheet.IdentityKeyNameNote);
  }, [appNavigation]);
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
          <IdentityKeyNameInput identity={identity} onInfoPress={handleInfoPress} />
        </View>
        <View style={continueStyle}>
          <Button label={translate("auth:continueButton")} icon={arrowIcon} iconPosition="right" onPress={onContinue} />
        </View>
      </View>
    </BottomSheetScrollView>
  );
}

function usePasskeyRegister(identity: ReturnType<typeof useIdentityKeyValidation>) {
  const authNav = useAuthNavigation();
  const { registerAccount, onAuthSuccess } = useAuthActions();
  const [error, setError] = useState<string | null>(null);

  const handleContinue = useCallback(async () => {
    if (!identity.validate()) return;
    setError(null);
    const result = await registerAccount({ identityKeyName: identity.value });
    if (!result) return;
    if (result.outcome === 'authenticated') {
      onAuthSuccess(identity.value);
      authNav.navigate(Routes.Auth.ProfileSetup);
      return;
    }
    if (result.outcome === 'error') setError(result.error.userMessage);
  }, [identity, registerAccount, onAuthSuccess, authNav]);

  return { handleContinue, error };
}

function PasskeyRegisterError({ message }: { message: string }) {
  const { colors, scale } = useTheme();
  const style = useMemo(() => ({
    position: "absolute" as const, bottom: scale.scaleSize(80), alignSelf: "center" as const,
    paddingHorizontal: scale.scaleSize(16), paddingVertical: scale.scaleSize(8),
  }), [scale]);

  return <Text variant="caption" color={colors.attentionRed} style={style}>{message}</Text>;
}

export function PasskeyRegisterScreen() {
  const identity = useIdentityKeyValidation();
  const theme = useTheme();
  const { handleContinue, error } = usePasskeyRegister(identity);

  const containerStyle = useMemo(
    () => ({ flex: 1 as const, backgroundColor: theme.colors.secondaryBackground }),
    [theme.colors],
  );

  return (
    <View style={containerStyle}>
      <PasskeyRegisterContent identity={identity} onContinue={handleContinue} />
      {error ? <PasskeyRegisterError message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
  },
});
