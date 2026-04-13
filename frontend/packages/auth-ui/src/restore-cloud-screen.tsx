import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Icon, SelectField, colorPalette, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useSheetScroll, useAppNavigation, Routes } from "@ion/navigation";
import { RegisterHeader } from "./register-header";
import { PasswordInput } from "./password-input";
import { PrimaryButton } from "./primary-button";
import { AuthFooter } from "./auth-footer";
import { getCloudProvider } from "./cloud-provider";

function RestoreCloudIcon() {
  return <Icon name="cloud-upload" size={36} color={colorPalette.white} />;
}

function useRestoreCloudForm(identityKeyNames: string[]) {
  const isSingleKey = identityKeyNames.length === 1;
  const [selectedKeyName, setSelectedKeyName] = useState<string | null>(isSingleKey ? identityKeyNames[0] ?? null : null);
  const [password, setPassword] = useState("");
  const isFormValid = selectedKeyName !== null && password.trim().length > 0;
  return { selectedKeyName, setSelectedKeyName, password, setPassword, isFormValid, isSingleKey };
}

function useFormStyles() {
  const { scale } = useTheme();
  return useMemo(() => ({
    page: { ...styles.page, paddingTop: scale.scaleSize(5), paddingHorizontal: scale.scaleSize(44) },
    formContainer: { ...styles.formContainer, marginTop: scale.scaleSize(88), gap: scale.scaleSize(21) },
    buttonWrapper: { marginTop: scale.scaleSize(20) },
  }), [scale]);
}

function SelectKeyPrefix() {
  const { colors, scale } = useTheme();
  return <Icon name="restore-key" size={scale.scaleSize(24)} color={colors.secondaryText} />;
}

function CloudRestoreForm({ form, identityKeyNames, containerStyle }: {
  form: ReturnType<typeof useRestoreCloudForm>;
  identityKeyNames: string[];
  containerStyle: object;
}) {
  return (
    <View style={containerStyle}>
      <SelectField
        label={translate("auth:identityKeyNameLabel")}
        value={form.selectedKeyName}
        options={identityKeyNames}
        onSelect={form.setSelectedKeyName}
        prefixIcon={form.isSingleKey ? undefined : <SelectKeyPrefix />}
        hasPrefixDivider={!form.isSingleKey}
        disabled={form.isSingleKey}
      />
      <PasswordInput
        value={form.password}
        onChangeText={form.setPassword}
        placeholder={translate("auth:passwordLabel")}
      />
    </View>
  );
}

function useRestoreHandler(form: ReturnType<typeof useRestoreCloudForm>, onNavigate: () => void) {
  const isSubmitting = useRef(false);

  return useCallback(() => {
    if (!form.isFormValid || isSubmitting.current) return;
    isSubmitting.current = true;
    try {
      onNavigate();
    } finally {
      isSubmitting.current = false;
    }
  }, [form.isFormValid, onNavigate]);
}

function RestoreCloudContent({ identityKeyNames }: { identityKeyNames: string[] }) {
  const sheetScroll = useSheetScroll();
  const formStyles = useFormStyles();
  const form = useRestoreCloudForm(identityKeyNames);
  const appNavigation = useAppNavigation();
  const cloudProvider = getCloudProvider();

  const handleRestore = useRestoreHandler(form, useCallback(() => {
    appNavigation.navigate(Routes.Sheet.RestoreSuccess);
  }, [appNavigation]));

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={formStyles.page}>
        <RegisterHeader
          icon={<RestoreCloudIcon />}
          title={translate("auth:restoreFromCloudTitle", { cloudProvider })}
          subtitle={translate("auth:restoreFromCloudDescription", { cloudProvider })}
        />
        <CloudRestoreForm form={form} identityKeyNames={identityKeyNames} containerStyle={formStyles.formContainer} />
        <View style={formStyles.buttonWrapper}>
          <PrimaryButton label={translate("auth:restoreButton")} disabled={!form.isFormValid} onPress={handleRestore} showArrow={false} style={styles.fullWidth} />
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

export function RestoreCloudScreen() {
  const containerStyle = useContainerStyle();
  const identityKeyNames = ["samuelaltman21", "samuelaltman", "altmancrypto"];

  return (
    <View style={containerStyle}>
      <RestoreCloudContent identityKeyNames={identityKeyNames} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flexGrow: 1,
    width: "100%",
  },
  formContainer: {
    width: "100%",
  },
  fullWidth: {
    width: "100%",
  },
});
