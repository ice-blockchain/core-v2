import { Pressable } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { TextInput } from "@ion/ui";
import { translate } from "@ion/localization";
import { InfoIcon } from "./info-icon";
import type { useIdentityKeyValidation } from "./identity-key-rules";

interface IdentityKeyNameInputProps {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  onInfoPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function IdentityKeyNameInput({ identity, onInfoPress, style }: IdentityKeyNameInputProps) {
  const errorProps = identity.errorMessage
    ? { state: "error" as const, errorMessage: identity.errorMessage }
    : {};

  const suffixIcon = (
    <Pressable onPress={onInfoPress} hitSlop={8} accessibilityRole="button">
      <InfoIcon />
    </Pressable>
  );

  return (
    <TextInput
      value={identity.value}
      onChangeText={identity.setValue}
      placeholder={translate("auth:identityKeyNameLabel")}
      prefixIcon="icon-identitykey"
      suffixIcon={suffixIcon}
      autoCapitalize={'none'}
      {...errorProps}
      style={style}
    />
  );
}
