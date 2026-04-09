import { useMemo } from "react";
import { View } from "react-native";
import { Button, TextField, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";

interface WalletViewNameFormProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function WalletViewNameForm({ value, onChangeText, onSubmit, isSubmitting }: WalletViewNameFormProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const isDisabled = !value.trim() || isSubmitting;

  const containerStyle = useMemo(() => ({ gap: scale(16) }), [scale]);

  return (
    <View style={containerStyle}>
      <TextField
        label={translate("walletUi:walletNameLabel")}
        value={value}
        onChangeText={onChangeText}
        isClearable
        textInputProps={{ autoFocus: true }}
      />
      <Button
        label={translate("walletUi:saveButton")}
        onPress={onSubmit}
        isDisabled={isDisabled}
        isLoading={isSubmitting}
      />
    </View>
  );
}
