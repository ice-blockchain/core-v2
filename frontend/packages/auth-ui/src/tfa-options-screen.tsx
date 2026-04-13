import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Icon, SelectField, colorPalette, useTheme } from "@ion/ui";
import type { SelectOption } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
import type { AuthStackParamList, TwoFaType, TwoFaOption } from "@ion/navigation";
import type { RouteProp } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import { RegisterHeader } from "./register-header";
import { PrimaryButton } from "./primary-button";
import { AuthFooter } from "./auth-footer";

type TfaOptionsRoute = RouteProp<AuthStackParamList, "TfaOptions">;

function TfaHeaderIcon() {
  return <Icon name="wallet-protect-fill" size={36} color={colorPalette.white} />;
}

interface TfaSelectOption extends SelectOption {
  type: TwoFaType;
}

function buildTfaOptions(colors: { secondaryText: string }): TfaSelectOption[] {
  return [
    { type: "auth", label: translate("auth:authenticatorCodeOption"), icon: <Icon name="login-authcode" size={20} color={colors.secondaryText} /> },
    { type: "email", label: translate("auth:emailCodeOption"), icon: <Icon name="field-email" size={20} color={colors.secondaryText} /> },
  ];
}

function useTfaOptionsForm(optionsCount: 1 | 2) {
  const [selections, setSelections] = useState<(string | null)[]>(() => Array.from({ length: optionsCount }, () => null));

  const setSelection = useCallback((index: number, value: string) => {
    setSelections((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const getDisabledOptions = useCallback((index: number): string[] => {
    return selections.filter((s, i): s is string => i !== index && s !== null);
  }, [selections]);

  const isFormValid = selections.every((selection) => selection !== null);
  return { selections, setSelection, getDisabledOptions, isFormValid };
}

function useFormStyles() {
  const { scale } = useTheme();
  return useMemo(() => ({
    page: { ...styles.page, paddingTop: scale.scaleSize(5), paddingHorizontal: scale.scaleSize(44) },
    formContainer: { ...styles.formContainer, marginTop: scale.scaleSize(88), gap: scale.scaleSize(21) },
    buttonWrapper: { marginTop: scale.scaleSize(21) },
  }), [scale]);
}

function SelectFieldPrefix() {
  const { colors, scale } = useTheme();
  const containerStyle = useMemo(() => ({
    width: scale.scaleSize(30),
    height: scale.scaleSize(30),
    borderRadius: scale.scaleRadius(10),
    borderWidth: 1,
    borderColor: colors.onTertiaryFill,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: scale.scaleSize(10),
  }), [scale, colors]);

  return (
    <View style={containerStyle}>
      <Icon name="field-select" size={scale.scaleSize(20)} color={colors.secondaryText} />
    </View>
  );
}

function TfaSelectFields({ form, optionsCount, tfaOptions }: {
  form: ReturnType<typeof useTfaOptionsForm>;
  optionsCount: 1 | 2;
  tfaOptions: SelectOption[];
}) {
  return (
    <>
      {Array.from({ length: optionsCount }, (_, index) => (
        <SelectField
          key={index}
          label={translate("auth:selectOptionLabel", { number: index + 1 })}
          value={form.selections[index] ?? null}
          options={tfaOptions}
          disabledOptions={form.getDisabledOptions(index)}
          onSelect={(value) => form.setSelection(index, value)}
          prefixIcon={<SelectFieldPrefix />}
        />
      ))}
    </>
  );
}

function buildSelectedMethods(selections: (string | null)[], tfaOptions: TfaSelectOption[]): TwoFaOption[] {
  return selections
    .filter((s): s is string => s !== null)
    .map((label) => {
      const option = tfaOptions.find((o) => o.label === label);
      return { type: option?.type ?? "auth", label };
    });
}

function TfaOptionsForm({ form, optionsCount }: {
  form: ReturnType<typeof useTfaOptionsForm>;
  optionsCount: 1 | 2;
}) {
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const tfaOptions = useMemo(() => buildTfaOptions(colors), [colors]);
  const authNav = useAuthNavigation();

  const handleConfirm = useCallback(() => {
    if (!form.isFormValid) return;
    const selectedMethods = buildSelectedMethods(form.selections, tfaOptions);
    authNav.navigate(Routes.Auth.TfaVerification, { selectedMethods });
  }, [form.isFormValid, form.selections, tfaOptions, authNav]);

  return (
    <>
      <View style={formStyles.formContainer}>
        <TfaSelectFields form={form} optionsCount={optionsCount} tfaOptions={tfaOptions} />
      </View>
      <View style={formStyles.buttonWrapper}>
        <PrimaryButton label={translate("auth:confirmButton")} disabled={!form.isFormValid} onPress={handleConfirm} showArrow={false} style={styles.fullWidth} />
      </View>
    </>
  );
}

function TfaOptionsContent({ optionsCount }: { optionsCount: 1 | 2 }) {
  const sheetScroll = useSheetScroll();
  const formStyles = useFormStyles();
  const form = useTfaOptionsForm(optionsCount);

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={formStyles.page}>
        <RegisterHeader
          icon={<TfaHeaderIcon />}
          title={translate("auth:tfaVerificationTitle")}
          subtitle={translate("auth:tfaVerificationSubtitle")}
        />
        <TfaOptionsForm form={form} optionsCount={optionsCount} />
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

export function TfaOptionsScreen() {
  const route = useRoute<TfaOptionsRoute>();
  const containerStyle = useContainerStyle();
  const optionsCount = route.params.optionsCount;

  return (
    <View style={containerStyle}>
      <TfaOptionsContent optionsCount={optionsCount} />
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
