import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useSheetScroll, useAppNavigation, Routes } from "@ion/navigation";
import { useIdentityKeyValidation } from "./identity-key-rules";
import { RegisterHeader } from "./register-header";
import { RegisterPasswordIcon } from "./register-password-icon";
import { PasswordFormFields } from "./password-form-fields";
import { PrimaryButton } from "./primary-button";
import { AuthFooter } from "./auth-footer";
import { usePasswordForm } from "./use-password-form";

function useFormStyles() {
  const { scale } = useTheme();

  return useMemo(() => ({
    page: { ...styles.page, paddingTop: scale.scaleSize(5) },
    headerWrapper: { paddingTop: scale.scaleSize(22) },
    formContainer: { ...styles.formContainer, marginTop: scale.scaleSize(60), gap: scale.scaleSize(16) },
    field: { width: scale.scaleSize(287) },
    checklist: { marginTop: scale.scaleSize(16), width: scale.scaleSize(287) },
    continueWrapper: { marginTop: scale.scaleSize(20), marginBottom: scale.scaleSize(8) },
  }), [scale]);
}

function SetNewPasswordHeader({ style }: { style: object }) {
  return (
    <View style={style}>
      <RegisterHeader
        icon={<RegisterPasswordIcon />}
        title={translate("auth:setNewPasswordTitle")}
        subtitle={translate("auth:setNewPasswordSubtitle")}
      />
    </View>
  );
}

function RestoreSetNewPasswordContent({ passwordForm, identity, onContinue }: {
  passwordForm: ReturnType<typeof usePasswordForm>;
  identity: ReturnType<typeof useIdentityKeyValidation>;
  onContinue: () => void;
}) {
  const sheetScroll = useSheetScroll();
  const formStyles = useFormStyles();
  const isIdentityKeyValid = identity.value.trim().length > 0 && !identity.errorMessage;
  const isFormValid = isIdentityKeyValid && (passwordForm.isPasswordFormValid || passwordForm.isPasswordEmpty);

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={formStyles.page}>
        <SetNewPasswordHeader style={formStyles.headerWrapper} />
        <PasswordFormFields
          passwordForm={passwordForm}
          styles={formStyles}
          identity={identity}
        />
        <View style={formStyles.continueWrapper}>
          <PrimaryButton label={translate("auth:continueButton")} disabled={!isFormValid} onPress={onContinue} />
        </View>
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

export function RestoreSetNewPasswordScreen() {
  const identity = useIdentityKeyValidation();
  const passwordForm = usePasswordForm();
  const containerStyle = useContainerStyle();
  const appNavigation = useAppNavigation();

  const handleContinue = useCallback(() => {
    appNavigation.navigate(Routes.Sheet.RestoreSuccess);
  }, [appNavigation]);

  return (
    <View style={containerStyle}>
      <RestoreSetNewPasswordContent passwordForm={passwordForm} identity={identity} onContinue={handleContinue} />
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
  formContainer: {
    alignItems: "center",
  },
});
