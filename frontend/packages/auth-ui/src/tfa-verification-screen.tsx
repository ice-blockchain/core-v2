import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Icon, colorPalette, useTheme } from "@ion/ui";
import type { IconName } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
import type { AuthStackParamList, TwoFaType } from "@ion/navigation";
import type { RouteProp } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import { RegisterHeader } from "./register-header";
import { PrimaryButton } from "./primary-button";
import { AuthFooter } from "./auth-footer";
import { TfaInput } from "./tfa-input";

type TfaVerificationRoute = RouteProp<AuthStackParamList, "TfaVerification">;

const ICON_MAP: Record<TwoFaType, IconName> = {
  email: "field-email",
  sms: "login-smscode",
  auth: "login-authcode",
};

const SENDABLE_TYPES = new Set<TwoFaType>(["email", "sms"]);

function TfaHeaderIcon() {
  return <Icon name="wallet-protect-fill" size={36} color={colorPalette.white} />;
}

function useFormStyles() {
  const { scale } = useTheme();
  return useMemo(() => ({
    page: { ...styles.page, paddingTop: scale.scaleSize(5), paddingHorizontal: scale.scaleSize(44) },
    formContainer: { ...styles.formContainer, marginTop: scale.scaleSize(71), gap: scale.scaleSize(16) },
    buttonWrapper: { marginTop: scale.scaleSize(20) },
  }), [scale]);
}

function useTfaVerificationForm(methodTypes: TwoFaType[]) {
  const [codes, setCodes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const type of methodTypes) {
      initial[type] = "";
    }
    return initial;
  });

  const setCode = useCallback((type: TwoFaType, value: string) => {
    setCodes((prev) => ({ ...prev, [type]: value }));
  }, []);

  const isFormValid = methodTypes.every((type) => (codes[type] ?? "").length > 0);

  return { codes, setCode, isFormValid };
}

function handleTfaSend(_type: TwoFaType) {
  // Backend integration will call requestRecoveryTwoFaCode / requestTwoFaCode
}

function TfaCodeInputs({ form, selectedMethods }: {
  form: ReturnType<typeof useTfaVerificationForm>;
  selectedMethods: { type: TwoFaType; label: string }[];
}) {
  return (
    <>
      {selectedMethods.map((method) => (
        <TfaInput
          key={method.type}
          value={form.codes[method.type] ?? ""}
          onChangeText={(value) => form.setCode(method.type, value)}
          placeholder={method.label}
          prefixIcon={ICON_MAP[method.type]}
          hasSendAction={SENDABLE_TYPES.has(method.type)}
          onSend={() => handleTfaSend(method.type)}
        />
      ))}
    </>
  );
}

function TfaVerificationForm({ form, selectedMethods, onConfirm }: {
  form: ReturnType<typeof useTfaVerificationForm>;
  selectedMethods: { type: TwoFaType; label: string }[];
  onConfirm: () => void;
}) {
  const formStyles = useFormStyles();

  return (
    <>
      <View style={formStyles.formContainer}>
        <TfaCodeInputs form={form} selectedMethods={selectedMethods} />
      </View>
      <View style={formStyles.buttonWrapper}>
        <PrimaryButton label={translate("auth:confirmButton")} disabled={!form.isFormValid} onPress={onConfirm} showArrow={false} style={styles.fullWidth} />
      </View>
    </>
  );
}

function TfaVerificationContent({ methodTypes, selectedMethods }: {
  methodTypes: TwoFaType[];
  selectedMethods: { type: TwoFaType; label: string }[];
}) {
  const sheetScroll = useSheetScroll();
  const formStyles = useFormStyles();
  const form = useTfaVerificationForm(methodTypes);
  const authNav = useAuthNavigation();

  const handleConfirm = useCallback(() => {
    if (!form.isFormValid) return;
    authNav.navigate(Routes.Auth.RestoreSetNewPassword);
  }, [form.isFormValid, authNav]);

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={formStyles.page}>
        <RegisterHeader icon={<TfaHeaderIcon />} title={translate("auth:tfaVerificationTitle")} subtitle={translate("auth:tfaVerificationSubtitle")} />
        <TfaVerificationForm form={form} selectedMethods={selectedMethods} onConfirm={handleConfirm} />
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

export function TfaVerificationScreen() {
  const route = useRoute<TfaVerificationRoute>();
  const containerStyle = useContainerStyle();
  const { selectedMethods } = route.params;
  const methodTypes = useMemo(() => selectedMethods.map((m) => m.type), [selectedMethods]);

  return (
    <View style={containerStyle}>
      <TfaVerificationContent methodTypes={methodTypes} selectedMethods={selectedMethods} />
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
