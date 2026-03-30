import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { translate } from "@ion/localization";
import type { IconName } from "@ion/ui";
import { TextField, Icon, useTheme } from "@ion/ui";
import { SheetHeader } from "./sheet-header";
import { RegisterHeader } from "./register-header";
import { PrimaryButton } from "./primary-button";
import { SecuredByFooter } from "./secured-by-footer";
import { TermsFooter } from "./terms-footer";
import { RestoreKeyIcon } from "./restore-key-icon";

interface RestoreCredentialsScreenProps {
  onBack: () => void;
  onRestore: (data: { identityKeyName: string; recoveryKeyId: string; recoveryCode: string }) => void;
  isLoading?: boolean;
}

function useRestoreCredentialsForm() {
  const [identityKeyName, setIdentityKeyName] = useState("");
  const [recoveryKeyId, setRecoveryKeyId] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const isFormValid = identityKeyName.trim().length > 0
    && recoveryKeyId.trim().length > 0
    && recoveryCode.trim().length > 0;

  return { identityKeyName, setIdentityKeyName, recoveryKeyId, setRecoveryKeyId, recoveryCode, setRecoveryCode, isFormValid };
}

function useFieldIcon(name: IconName) {
  const theme = useTheme();
  return <Icon name={name} size={20} color={theme.colors.tertiaryText} />;
}

const NO_AUTO_CAPITALIZE = { autoCapitalize: "none" as const };

interface CredentialFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: IconName;
}

function CredentialField({ label, value, onChangeText, icon }: CredentialFieldProps) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      prefixIcon={useFieldIcon(icon)}
      hasPrefixDivider
      textInputProps={NO_AUTO_CAPITALIZE}
      style={styles.field}
    />
  );
}

function CredentialsForm({ form }: { form: ReturnType<typeof useRestoreCredentialsForm> }) {
  return (
    <View style={styles.formContainer}>
      <CredentialField label={translate("auth:identityKeyNameLabel")} value={form.identityKeyName} onChangeText={form.setIdentityKeyName} icon="field-identitykey" />
      <CredentialField label={translate("auth:recoveryKeyIdPlaceholder")} value={form.recoveryKeyId} onChangeText={form.setRecoveryKeyId} icon="channel-private" />
      <CredentialField label={translate("auth:recoveryCodePlaceholder")} value={form.recoveryCode} onChangeText={form.setRecoveryCode} icon="recovery-code" />
    </View>
  );
}

function RestoreButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  return (
    <View style={styles.buttonWrapper}>
      <PrimaryButton label={translate("auth:restoreButton")} onPress={onPress} disabled={disabled} showArrow={false} />
    </View>
  );
}

function useRestoreHandler(
  form: ReturnType<typeof useRestoreCredentialsForm>,
  onRestore: RestoreCredentialsScreenProps["onRestore"],
) {
  const isSubmitting = useRef(false);

  return useCallback(() => {
    if (!form.isFormValid || isSubmitting.current) return;
    isSubmitting.current = true;
    try {
      onRestore({
        identityKeyName: form.identityKeyName.trim(),
        recoveryKeyId: form.recoveryKeyId.trim(),
        recoveryCode: form.recoveryCode.trim(),
      });
    } finally {
      isSubmitting.current = false;
    }
  }, [form.isFormValid, form.identityKeyName, form.recoveryKeyId, form.recoveryCode, onRestore]);
}

export function RestoreCredentialsScreen({ onBack, onRestore, isLoading }: RestoreCredentialsScreenProps) {
  const form = useRestoreCredentialsForm();
  const handleRestore = useRestoreHandler(form, onRestore);

  return (
    <View style={styles.page}>
      <SheetHeader title="" onBack={onBack} />
      <RegisterHeader icon={<RestoreKeyIcon />} title={translate("auth:restoreMenuTitle")} subtitle={translate("auth:restoreCredentialsSubtitle")} />
      <CredentialsForm form={form} />
      <RestoreButton onPress={handleRestore} disabled={!form.isFormValid || !!isLoading} />
      <View style={styles.footer}>
        <SecuredByFooter />
        <TermsFooter />
      </View>
    </View>
  );
}

const FIELD_WIDTH = 287;
const FORM_TOP_MARGIN = 36;
const FOOTER_BOTTOM_PADDING = 40;

const styles = StyleSheet.create({
  page: {
    alignItems: "center",
    width: "100%",
  },
  formContainer: {
    marginTop: FORM_TOP_MARGIN,
    gap: 16,
  },
  field: {
    width: FIELD_WIDTH,
  },
  buttonWrapper: {
    marginTop: 20,
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
    gap: 12,
    paddingBottom: FOOTER_BOTTOM_PADDING,
  },
});
