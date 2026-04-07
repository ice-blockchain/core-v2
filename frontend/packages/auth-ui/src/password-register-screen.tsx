import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAppNavigation, useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
import { PrimaryButton } from "./primary-button";
import { RegisterHeader } from "./register-header";
import { RegisterPasswordIcon } from "./register-password-icon";
import { PasswordFormFields } from "./password-form-fields";
import { AuthFooter } from "./auth-footer";
import { useIdentityKeyValidation } from "./identity-key-rules";
import { usePasswordForm } from "./use-password-form";
import { useAuthActions } from "./auth-actions-context";
import { isInlineAuthError } from "./is-inline-error";

export interface RegisterScreenCallbacks {
  onContinue: (data: { identityKeyName: string; password?: string }) => void;
  onBack: () => void;
  isPasskeyAvailable?: boolean;
}

function useContentStyles() {
  const { scale } = useTheme();

  return useMemo(() => ({
    headerWrapper: { paddingTop: scale.scaleSize(22) },
    formContainer: { ...styles.formContainer, marginTop: scale.scaleSize(60), gap: scale.scaleSize(16) },
    field: { width: scale.scaleSize(287) },
    checklist: { marginTop: scale.scaleSize(16), width: scale.scaleSize(287) },
    continueWrapper: { marginTop: scale.scaleSize(20) },
  }), [scale]);
}

function PasswordRegisterHeader({ style }: { style: object }) {
  return (
    <View style={style}>
      <RegisterHeader icon={<RegisterPasswordIcon />} title={translate("auth:registerTitle")} subtitle={translate("auth:registerSubtitle")} />
    </View>
  );
}

function RegisterContent({ identity, passwordForm, onContinue, isLoading }: {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  passwordForm: ReturnType<typeof usePasswordForm>;
  onContinue: () => void;
  isLoading: boolean;
}) {
  const sheetScroll = useSheetScroll();
  const contentStyles = useContentStyles();
  const isIdentityKeyValid = identity.value.trim().length > 0 && !identity.errorMessage;
  const isFormValid = isIdentityKeyValid && (passwordForm.isPasswordFormValid || passwordForm.isPasswordEmpty);

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={styles.page}>
        <PasswordRegisterHeader style={contentStyles.headerWrapper} />
        <PasswordFormFields
          passwordForm={passwordForm}
          styles={contentStyles}
          identity={identity}
        />
        <View style={contentStyles.continueWrapper}>
          <PrimaryButton label={translate("auth:continueButton")} onPress={onContinue} disabled={!isFormValid} loading={isLoading} />
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

interface PasswordRegisterContext {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  authNav: ReturnType<typeof useAuthNavigation>;
  appNavigation: ReturnType<typeof useAppNavigation>;
  onAuthSuccess: (username: string) => void;
}

function handlePasswordRegisterResult(
  result: Awaited<ReturnType<ReturnType<typeof useAuthActions>['registerAccount']>>,
  ctx: PasswordRegisterContext,
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

function usePasswordRegister(
  identity: ReturnType<typeof useIdentityKeyValidation>,
  passwordForm: ReturnType<typeof usePasswordForm>,
) {
  const authNav = useAuthNavigation();
  const appNavigation = useAppNavigation();
  const { registerAccount, onAuthSuccess, isRegisterLoading } = useAuthActions();

  const handleContinue = useCallback(async () => {
    const isValid = identity.value.trim().length > 0 && !identity.errorMessage;
    const canSubmit = isValid && (passwordForm.isPasswordFormValid || passwordForm.isPasswordEmpty);
    if (!canSubmit) return;
    const result = await registerAccount({ identityKeyName: identity.value, password: passwordForm.password });
    handlePasswordRegisterResult(result, { identity, authNav, appNavigation, onAuthSuccess });
  }, [identity, passwordForm.isPasswordFormValid, passwordForm.isPasswordEmpty, passwordForm.password, registerAccount, onAuthSuccess, authNav, appNavigation]);

  return { handleContinue, isLoading: isRegisterLoading };
}

export function PasswordRegisterScreen() {
  const identity = useIdentityKeyValidation();
  const passwordForm = usePasswordForm();
  const containerStyle = useContainerStyle();
  const { handleContinue, isLoading } = usePasswordRegister(identity, passwordForm);

  return (
    <View style={containerStyle}>
      <RegisterContent identity={identity} passwordForm={passwordForm} onContinue={handleContinue} isLoading={isLoading} />
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
