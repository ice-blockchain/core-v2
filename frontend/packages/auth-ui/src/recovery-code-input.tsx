import type { StyleProp, ViewStyle } from "react-native";
import { TextInput } from "@ion/ui";
import { translate } from "@ion/localization";

interface RecoveryCodeInputProps {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function RecoveryCodeInput({ value, onChangeText, style }: RecoveryCodeInputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={translate("auth:recoveryCodePlaceholder")}
      prefixIcon="recovery-code"
      autoCapitalize="none"
      autoCorrect={false}
      style={style}
    />
  );
}
