import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { translate } from "@ion/localization";
import { TextInput } from "@ion/ui";
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

function CredentialsForm({ form }: { form: ReturnType<typeof useRestoreCredentialsForm> }) {
  return (
    <View style={styles.formContainer}>
      <TextInput
        value={form.identityKeyName}
        onChangeText={form.setIdentityKeyName}
        placeholder={translate("auth:identityKeyNameLabel")}
        prefixIcon="field-identitykey"
        style={styles.field}
      />
      <TextInput
        value={form.recoveryKeyId}
        onChangeText={form.setRecoveryKeyId}
        placeholder={translate("auth:recoveryKeyIdPlaceholder")}
        prefixIcon="channel-private"
        style={styles.field}
      />
      <TextInput
        value={form.recoveryCode}
        onChangeText={form.setRecoveryCode}
        placeholder={translate("auth:recoveryCodePlaceholder")}
        prefixIcon="recovery-code"
        style={styles.field}
      />
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

export function RestoreCredentialsScreen({ onBack, onRestore, isLoading }: RestoreCredentialsScreenProps) {
  const form = useRestoreCredentialsForm();

  const handleRestore = useCallback(() => {
    if (!form.isFormValid) return;
    onRestore({ identityKeyName: form.identityKeyName.trim(), recoveryKeyId: form.recoveryKeyId.trim(), recoveryCode: form.recoveryCode.trim() });
  }, [form.isFormValid, form.identityKeyName, form.recoveryKeyId, form.recoveryCode, onRestore]);

  return (
    <View style={styles.page}>
      <SheetHeader title="" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <RegisterHeader icon={<RestoreKeyIcon />} title={translate("auth:restoreMenuTitle")} subtitle={translate("auth:restoreCredentialsSubtitle")} />
        <CredentialsForm form={form} />
        <RestoreButton onPress={handleRestore} disabled={!form.isFormValid || !!isLoading} />
      </ScrollView>
      <View style={styles.footer}>
        <SecuredByFooter />
        <TermsFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
    width: "100%",
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: 24,
  },
  formContainer: {
    marginTop: 36,
    gap: 16,
  },
  field: {
    width: 287,
  },
  buttonWrapper: {
    marginTop: 20,
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
    gap: 12,
    paddingBottom: 40,
  },
});
