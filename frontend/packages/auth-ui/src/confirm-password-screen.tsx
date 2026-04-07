import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { DynamicSheet, InformationSheetContent, useAppNavigation } from "@ion/navigation";
import { PasswordInput } from "./password-input";
import { VerifyPasswordIcon } from "./verify-password-icon";

let passwordConfirmed = false;

export function wasPasswordConfirmed(): boolean {
  return passwordConfirmed;
}

export function resetPasswordConfirmed(): void {
  passwordConfirmed = false;
}

function ConfirmPasswordDescription() {
  const { colors } = useTheme();

  return (
    <Text variant="body2" color={colors.secondaryText} style={styles.subtitle}>
      {translate("auth:verifyPasswordConfirmSubtitle")}
    </Text>
  );
}

function useFormStyles() {
  const { scale } = useTheme();
  return useMemo(() => ({
    container: { paddingHorizontal: scale.scaleSize(16), paddingBottom: scale.scaleSize(16), paddingTop: scale.scaleSize(24), gap: scale.scaleSize(24) },
    input: { paddingHorizontal: scale.scaleSize(28) },
  }), [scale]);
}

function ConfirmPasswordForm({ onConfirm }: { onConfirm: () => void }) {
  const [password, setPassword] = useState("");
  const formStyles = useFormStyles();

  const handleConfirm = useCallback(() => {
    if (password.trim()) onConfirm();
  }, [password, onConfirm]);

  return (
    <View style={formStyles.container}>
      <View style={formStyles.input}>
        <PasswordInput
          value={password}
          onChangeText={setPassword}
          placeholder={translate("auth:passwordLabel")}
        />
      </View>
      <Button
        label={translate("auth:confirmButton")}
        onPress={handleConfirm}
        height={56}
        isDisabled={!password.trim()}
      />
    </View>
  );
}

export function ConfirmPasswordScreen() {
  const navigation = useAppNavigation();

  const handleDismiss = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const handleConfirm = useCallback(() => {
    passwordConfirmed = true;
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  return (
    <DynamicSheet showClose={false} isDismissable onDismiss={handleDismiss}>
      <InformationSheetContent
        icon={<VerifyPasswordIcon />}
        title={translate("auth:verifyPasswordTitle")}
        description={<ConfirmPasswordDescription />}
        topPadding={30}
      />
      <ConfirmPasswordForm onConfirm={handleConfirm} />
    </DynamicSheet>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    textAlign: "center",
  },
});
