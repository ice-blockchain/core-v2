import { useState } from "react";
import { View } from "react-native";
import { Icon } from "../icons/Icon";
import { TextInputContent } from "./TextInputContent";
import { TextInputPrefix } from "./TextInputPrefix";
import { useDebouncedCallback, useTextInputStyles } from "./text-input-hooks";
import type { TextInputProps, TextInputState } from "./text-input-types";

function resolveVisualState(value: string, isFocused: boolean, state?: TextInputState): TextInputState {
  if (state === "error") return "error";
  if (state === "valid") return "valid";
  if (isFocused) return "focused";
  return "empty";
}

function ValidCheckmark({ size, color }: { size: number; color: string }) {
  return <Icon name="checkbox-on" size={size} color={color} />;
}

function useFocusHandlers(props: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const handleFocus = () => { setIsFocused(true); props.onFocus?.(); };
  const handleBlur = () => { setIsFocused(false); props.onBlur?.(); };
  return { isFocused, handleFocus, handleBlur };
}

export function TextInput(props: TextInputProps) {
  const { value, onChangeText, placeholder, prefixIcon, suffixIcon, state, errorMessage, style } = props;
  const { isFocused, handleFocus, handleBlur } = useFocusHandlers(props);
  const visualState = resolveVisualState(value, isFocused, state);
  const { borderColors, containerStyle, separatorStyle, inputStyle, theme, scale } = useTextInputStyles(visualState);
  const handleChangeText = useDebouncedCallback(onChangeText, props.debounceMs);
  const showFloatingLabel = isFocused || value.length > 0;
  const floatingLabelText = (visualState === "error" && errorMessage) ? errorMessage : placeholder;
  const showPrefix = prefixIcon && !showFloatingLabel;

  return (
    <View style={style}>
      <View style={containerStyle}>
        {showPrefix ? (
          <TextInputPrefix icon={prefixIcon} iconSize={scale(24)} iconColor={borderColors.icon} separatorStyle={separatorStyle} />
        ) : null}
        <TextInputContent
          value={value} onChangeText={handleChangeText} placeholder={placeholder}
          showFloatingLabel={showFloatingLabel} floatingLabelText={floatingLabelText}
          labelColor={borderColors.label} inputStyle={inputStyle}
          maxLength={props.maxLength} autoCapitalize={props.autoCapitalize}
          keyboardType={props.keyboardType}
          secureTextEntry={props.secureTextEntry} autoCorrect={props.autoCorrect}
          onFocus={handleFocus} onBlur={handleBlur} testID={props.testID}
        />
        {!suffixIcon && visualState === "valid" ? <ValidCheckmark size={scale(24)} color={theme.colors.success} /> : null}
        {suffixIcon ?? null}
      </View>
    </View>
  );
}

export type { TextInputProps, TextInputState } from "./text-input-types";
