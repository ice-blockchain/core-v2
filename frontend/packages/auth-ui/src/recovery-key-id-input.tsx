import type { StyleProp, ViewStyle } from "react-native";
import { TextInput } from "@ion/ui";
import { translate } from "@ion/localization";

interface RecoveryKeyIdInputProps {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function RecoveryKeyIdInput({ value, onChangeText, style }: RecoveryKeyIdInputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={translate("auth:recoveryKeyIdPlaceholder")}
      prefixIcon="channel-private"
      autoCapitalize="none"
      autoCorrect={false}
      style={style}
    />
  );
}
