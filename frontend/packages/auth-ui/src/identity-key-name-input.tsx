import { useCallback } from "react";
import { Pressable } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { TextInput, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useAppNavigation, Routes } from "@ion/navigation";
import { InfoIcon } from "./info-icon";
import type { useIdentityKeyValidation } from "./identity-key-rules";

interface IdentityKeyNameInputProps {
  identity: ReturnType<typeof useIdentityKeyValidation>;
  style?: StyleProp<ViewStyle>;
}

function InfoButton({ onPress, size }: { onPress: () => void; size: number }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={translate("auth:identityKeyNameNoteModalTitle")}
    >
      <InfoIcon size={size} />
    </Pressable>
  );
}

export function IdentityKeyNameInput({ identity, style }: IdentityKeyNameInputProps) {
  const { scale } = useTheme();
  const appNavigation = useAppNavigation();

  const handleInfoPress = useCallback(() => {
    appNavigation.navigate(Routes.Sheet.IdentityKeyNameNote);
  }, [appNavigation]);

  const errorProps = identity.errorMessage
    ? { state: "error" as const, errorMessage: identity.errorMessage }
    : {};

  return (
    <TextInput
      value={identity.value}
      onChangeText={identity.setValue}
      placeholder={translate("auth:identityKeyNameLabel")}
      prefixIcon="icon-identitykey"
      suffixIcon={<InfoButton onPress={handleInfoPress} size={scale.scaleSize(24)} />}
      autoCapitalize={'none'}
      {...errorProps}
      style={style}
    />
  );
}
