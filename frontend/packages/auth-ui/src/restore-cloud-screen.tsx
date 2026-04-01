import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { translate } from "@ion/localization";
import { Button, Icon, SelectField, TextField, colorPalette } from "@ion/ui";
import { SheetHeader } from "./sheet-header";
import { RegisterHeader } from "./register-header";
import { SecuredByFooter } from "./secured-by-footer";
import { TermsFooter } from "./terms-footer";
import { EyeIcon } from "./eye-icon";
import { getCloudProvider } from "./cloud-provider";

interface RestoreCloudScreenProps {
  onBack: () => void;
  onRestore: (data: { identityKeyName: string; password: string }) => void;
  identityKeyNames: string[];
  isLoading?: boolean;
}

function useRestoreCloudForm() {
  const [selectedKeyName, setSelectedKeyName] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isFormValid = selectedKeyName !== null && password.trim().length > 0;

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible((prev) => !prev);
  }, []);

  return { selectedKeyName, setSelectedKeyName, password, setPassword, isPasswordVisible, togglePasswordVisibility, isFormValid };
}

function RestoreCloudIcon() {
  return <Icon name="restore-cloud" size={36} color={colorPalette.white} />;
}

function PasswordSuffixIcon({ isOff, onPress }: { isOff: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isOff ? "Show password" : "Hide password"}
    >
      <EyeIcon isOff={isOff} />
    </Pressable>
  );
}

function CloudRestoreForm({ form, identityKeyNames }: { form: ReturnType<typeof useRestoreCloudForm>; identityKeyNames: string[] }) {
  return (
    <View style={styles.formContainer}>
      <SelectField
        label={translate("auth:selectIdentityKeyNameLabel")}
        value={form.selectedKeyName}
        options={identityKeyNames}
        onSelect={form.setSelectedKeyName}
        style={styles.field}
      />
      <TextField
        label={translate("auth:passwordLabel")}
        value={form.password}
        onChangeText={form.setPassword}
        isSecureTextEntry={!form.isPasswordVisible}
        suffixIcon={<PasswordSuffixIcon isOff={!form.isPasswordVisible} onPress={form.togglePasswordVisibility} />}
        style={styles.field}
      />
    </View>
  );
}

function useRestoreHandler(
  form: ReturnType<typeof useRestoreCloudForm>,
  onRestore: RestoreCloudScreenProps["onRestore"],
) {
  const isSubmitting = useRef(false);

  return useCallback(() => {
    if (!form.isFormValid || isSubmitting.current) return;
    isSubmitting.current = true;
    try {
      onRestore({
        identityKeyName: form.selectedKeyName!,
        password: form.password.trim(),
      });
    } finally {
      isSubmitting.current = false;
    }
  }, [form.isFormValid, form.selectedKeyName, form.password, onRestore]);
}

export function RestoreCloudScreen({ onBack, onRestore, identityKeyNames, isLoading }: RestoreCloudScreenProps) {
  const form = useRestoreCloudForm();
  const handleRestore = useRestoreHandler(form, onRestore);
  const cloudProvider = getCloudProvider();

  return (
    <View style={styles.page}>
      <SheetHeader title="" onBack={onBack} />
      <RegisterHeader
        icon={<RestoreCloudIcon />}
        title={translate("auth:restoreFromCloudTitle", { cloudProvider })}
        subtitle={translate("auth:restoreFromCloudDescription", { cloudProvider })}
      />
      <CloudRestoreForm form={form} identityKeyNames={identityKeyNames} />
      <View style={styles.buttonWrapper}>
        <Button
          color="primary"
          label={translate("auth:restoreButton")}
          isDisabled={!form.isFormValid || !!isLoading}
          isLoading={isLoading ?? false}
          onPress={handleRestore}
        />
      </View>
      <View style={styles.footer}>
        <SecuredByFooter />
        <TermsFooter />
      </View>
    </View>
  );
}

const FIELD_WIDTH = 287;

const styles = StyleSheet.create({
  page: {
    alignItems: "center",
    width: "100%",
  },
  formContainer: {
    marginTop: 36,
    gap: 21,
  },
  field: {
    width: FIELD_WIDTH,
  },
  buttonWrapper: {
    marginTop: 20,
    width: FIELD_WIDTH,
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
    gap: 12,
    paddingBottom: 40,
  },
});
