import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { Icon, TextInput, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import type { StyleProp, ViewStyle } from "react-native";
import type { TextInputState } from "@ion/ui";

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  state?: TextInputState;
  errorMessage?: string;
  onFocusChange?: (focused: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

function usePasswordVisibility() {
  const [isVisible, setIsVisible] = useState(false);
  const toggle = useCallback(() => setIsVisible((v) => !v), []);
  return { isVisible, toggle };
}

function usePasswordFocus(onFocusChange?: (focused: boolean) => void) {
  const [isFocused, setIsFocused] = useState(false);
  const handleFocus = useCallback(() => { setIsFocused(true); onFocusChange?.(true); }, [onFocusChange]);
  const handleBlur = useCallback(() => { setIsFocused(false); onFocusChange?.(false); }, [onFocusChange]);
  return { isFocused, handleFocus, handleBlur };
}

function EyeToggle({ isVisible, onPress }: { isVisible: boolean; onPress: () => void }) {
  const { colors, scale } = useTheme();
  const iconName = isVisible ? "block-eye-on" : "block-eye-off";
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isVisible ? translate("auth:hidePassword") : translate("auth:showPassword")}
      accessibilityState={{ selected: isVisible }}
    >
      <Icon name={iconName} size={scale.scaleSize(24)} color={colors.secondaryText} />
    </Pressable>
  );
}

export function PasswordInput(props: PasswordInputProps) {
  const { isVisible, toggle } = usePasswordVisibility();
  const { handleFocus, handleBlur } = usePasswordFocus(props.onFocusChange);

  return (
    <View>
      <TextInput
        value={props.value} onChangeText={props.onChangeText} placeholder={props.placeholder}
        prefixIcon="field-pass" suffixIcon={<EyeToggle isVisible={isVisible} onPress={toggle} />}
        secureTextEntry={!isVisible} autoCorrect={false} autoCapitalize="none"
        {...(props.state ? { state: props.state, errorMessage: props.errorMessage } : {})}
        onFocus={handleFocus} onBlur={handleBlur} style={props.style}
      />
    </View>
  );
}
