import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
import { RegisterHeader } from "./register-header";
import { AuthFooter } from "./auth-footer";
import { RestoreKeyIcon } from "./restore-key-icon";
import { IdentityKeyNameInput } from "./identity-key-name-input";
import { RecoveryKeyIdInput } from "./recovery-key-id-input";
import { RecoveryCodeInput } from "./recovery-code-input";
import { PrimaryButton } from "./primary-button";
import { useIdentityKeyValidation } from "./identity-key-rules";

function useFormStyles() {
  const { scale } = useTheme();

  return useMemo(() => ({
    field: { width: scale.scaleSize(287) },
    form: {
      ...styles.form,
      marginTop: scale.scaleSize(36),
      gap: scale.scaleSize(16),
    },
    buttonWrapper: { marginTop: scale.scaleSize(20) },
    page: { ...styles.page, paddingTop: scale.scaleSize(5) },
  }), [scale]);
}

function useRestoreForm(identity: ReturnType<typeof useIdentityKeyValidation>) {
  const [recoveryKeyId, setRecoveryKeyId] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const hasIdentity = identity.value.trim().length > 0 && !identity.errorMessage;
  const isFormValid = hasIdentity && recoveryKeyId.trim().length > 0 && recoveryCode.trim().length > 0;

  return { recoveryKeyId, setRecoveryKeyId, recoveryCode, setRecoveryCode, isFormValid };
}

function RestoreForm({ identity, form }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  form: ReturnType<typeof useRestoreForm>;
}) {
  const formStyles = useFormStyles();
  const authNav = useAuthNavigation();
  const handleRestore = useCallback(() => {
    if (!form.isFormValid) return;
    authNav.navigate(Routes.Auth.RestoreSetNewPassword);
  }, [form.isFormValid, authNav]);

  return (
    <>
      <View style={formStyles.form}>
        <IdentityKeyNameInput identity={identity} style={formStyles.field} />
        <RecoveryKeyIdInput value={form.recoveryKeyId} onChangeText={form.setRecoveryKeyId} style={formStyles.field} />
        <RecoveryCodeInput value={form.recoveryCode} onChangeText={form.setRecoveryCode} style={formStyles.field} />
      </View>
      <View style={formStyles.buttonWrapper}>
        <PrimaryButton label={translate("auth:restoreButton")} showArrow={false} onPress={handleRestore} disabled={!form.isFormValid} />
      </View>
    </>
  );
}

function RestoreContent({ identity, form }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  form: ReturnType<typeof useRestoreForm>;
}) {
  const sheetScroll = useSheetScroll();
  const formStyles = useFormStyles();

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={formStyles.page}>
        <RegisterHeader icon={<RestoreKeyIcon />} title={translate("auth:restoreMenuTitle")} subtitle={translate("auth:restoreCredentialsSubtitle")} />
        <RestoreForm identity={identity} form={form} />
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

export function RestoreWithRecoveryCredsScreen() {
  const identity = useIdentityKeyValidation();
  const form = useRestoreForm(identity);
  const containerStyle = useContainerStyle();

  return (
    <View style={containerStyle}>
      <RestoreContent identity={identity} form={form} />
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
  form: {
    alignItems: "center",
  },
});
