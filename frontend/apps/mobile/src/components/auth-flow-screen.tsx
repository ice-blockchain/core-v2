import { useCallback, useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { useAppNavigation, Routes, Sheet } from "@ion/navigation";
import { useAuthFlow } from "@ion/auth";
import type { AuthFlowConfig, AuthPhase } from "@ion/auth";
import { translate } from "@ion/localization";
import {
  GetStartedScreen, PasswordRegisterScreen, PasskeyRegisterScreen,
  VerifyPasswordBackground, VerifyPasswordOverlay,
  RestoreMenuScreen, RestoreCredentialsScreen, SetNewPasswordScreen,
  RestoreSuccessModal, IdentityKeyNotFoundModal,
} from "@ion/auth-ui";
import { identityClient } from "../identity-client";

const PHASE_TITLE_KEYS: Record<AuthPhase, string> = {
  'get-started': 'auth:getStartedTitle',
  'register': 'auth:registerTitle',
  'verify-password': 'auth:verifyPasswordTitle',
  'restore-menu': 'auth:restoreMenuTitle',
  'restore-credentials': 'auth:restoreUsingCredentialsTitle',
  'set-new-password': 'auth:setNewPasswordTitle',
};

export function AuthFlowScreen() {
  const navigation = useAppNavigation();

  const onAuthSuccess = useCallback((_username: string) => {
    navigation.reset({ index: 0, routes: [{ name: Routes.Main }] });
  }, [navigation]);

  const config: AuthFlowConfig = useMemo(() => ({
    identityClient,
    onAuthSuccess,
    loadingElement: <ActivityIndicator size="large" />,
  }), [onAuthSuccess]);

  const { state, screenProps } = useAuthFlow(config);

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);

  const handleBack = useCallback(() => {
    if (state.phase === 'get-started') return navigation.goBack();
    const backActions: Partial<Record<AuthPhase, () => void>> = {
      'register': screenProps.register.onBack,
      'restore-menu': screenProps.restoreMenu.onBack,
      'restore-credentials': screenProps.restoreCredentials.onBack,
      'set-new-password': screenProps.setNewPassword.onBack,
    };
    backActions[state.phase]?.();
  }, [state.phase, screenProps, navigation]);

  const title = translate(PHASE_TITLE_KEYS[state.phase]);
  const hideBack = state.phase === 'verify-password';

  return (
    <Sheet onClose={handleClose} title={title} onBack={hideBack ? undefined : handleBack}>
      <AuthFlowPhase state={state} screenProps={screenProps} />
      <RestoreSuccessModal {...screenProps.restoreSuccessModal} />
      <IdentityKeyNotFoundModal {...screenProps.identityKeyNotFoundModal} />
      <AuthFlowError error={state.error?.userMessage} />
    </Sheet>
  );
}

function AuthFlowPhase({ state, screenProps }: { state: ReturnType<typeof useAuthFlow>['state']; screenProps: ReturnType<typeof useAuthFlow>['screenProps'] }) {
  switch (state.phase) {
    case "get-started":
      return <GetStartedScreen callbacks={screenProps.getStarted} />;
    case "register":
      return screenProps.register.passkeyAvailable
        ? <PasskeyRegisterScreen callbacks={screenProps.register} />
        : <PasswordRegisterScreen callbacks={screenProps.register} />;
    case "verify-password":
      return <VerifyPasswordPhase screenProps={screenProps} />;
    case "restore-menu":
      return <RestoreMenuScreen {...screenProps.restoreMenu} />;
    case "restore-credentials":
      return <RestoreCredentialsScreen {...screenProps.restoreCredentials} />;
    case "set-new-password":
      return <SetNewPasswordScreen {...screenProps.setNewPassword} />;
    default:
      return null;
  }
}

function VerifyPasswordPhase({ screenProps }: { screenProps: ReturnType<typeof useAuthFlow>['screenProps'] }) {
  return (
    <View style={styles.fill}>
      <VerifyPasswordBackground {...screenProps.verifyPassword.backgroundProps} />
      <VerifyPasswordOverlay {...screenProps.verifyPassword.overlayProps} />
    </View>
  );
}

function AuthFlowError({ error }: { error?: string }) {
  const { colors } = useTheme();
  if (!error) return null;
  return (
    <View style={styles.errorBanner}>
      <Text variant="caption" color={colors.attentionRed}>{error}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  errorBanner: { position: "absolute", bottom: 80, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8 },
});
