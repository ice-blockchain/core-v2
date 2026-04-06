import { useCallback, useMemo } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { useAuthFlow } from "@ion/auth";
import type { AuthFlowConfig } from "@ion/auth";
import {
  VerifyPasswordBackground, VerifyPasswordOverlay,
  RestoreMenuScreen, RestoreCredentialsScreen, SetNewPasswordScreen,
  RestoreSuccessModal, IdentityKeyNotFoundModal,
} from "@ion/auth-ui";
import { identityClient } from "../identity-client";
import { AuthFlowGetStarted } from "./auth-flow-get-started";
import { AuthFlowRegister } from "./auth-flow-register";

function useAuthFlowConfig(): AuthFlowConfig {
  const onAuthSuccess = useCallback((username: string) => {
    Alert.alert('Auth Success', `Logged in as ${username}`);
  }, []);

  return useMemo(() => ({
    identityClient,
    onAuthSuccess,
    loadingElement: <ActivityIndicator size="large" />,
  }), [onAuthSuccess]);
}

export function AuthFlowScreen() {
  const config = useAuthFlowConfig();
  const { state, screenProps } = useAuthFlow(config);
  const { colors } = useTheme();

  const containerStyle = useMemo(
    () => ({ flex: 1 as const, backgroundColor: colors.secondaryBackground }),
    [colors.secondaryBackground],
  );

  return (
    <View style={containerStyle}>
      <AuthFlowPhase state={state} screenProps={screenProps} />
      <RestoreSuccessModal {...screenProps.restoreSuccessModal} />
      <IdentityKeyNotFoundModal {...screenProps.identityKeyNotFoundModal} />
      <AuthFlowError error={state.error?.userMessage} />
    </View>
  );
}

function AuthFlowPhase({ state, screenProps }: { state: AuthFlowConfig extends never ? never : ReturnType<typeof useAuthFlow>['state']; screenProps: ReturnType<typeof useAuthFlow>['screenProps'] }) {
  switch (state.phase) {
    case "get-started":
      return <ScrollView contentContainerStyle={styles.scroll}><AuthFlowGetStarted callbacks={screenProps.getStarted} /></ScrollView>;
    case "register":
      return <AuthFlowRegister callbacks={screenProps.register} />;
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
  scroll: { flexGrow: 1 },
  fill: { flex: 1 },
  errorBanner: { position: "absolute", bottom: 80, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8 },
});
