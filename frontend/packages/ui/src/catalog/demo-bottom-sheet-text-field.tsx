import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useTheme } from "../theme/ThemeProvider";
import { TextFieldFloatingLabel } from "../components/TextFieldFloatingLabel";
import { TextFieldIconSlot } from "../components/TextFieldIconSlot";
import { TextFieldClearButton } from "../components/TextFieldClearButton";
import {
  buildTextFieldContainerStyle,
  buildTextFieldInputStyle,
  deriveTextFieldState,
  resolveTextFieldColorSpec,
} from "../components/TextFieldStyles";

export interface DemoBottomSheetTextFieldProps {
  label: string;
  defaultValue?: string;
  state?: "error" | "verified" | "disabled";
  errorMessage?: string;
  isSecureTextEntry?: boolean;
  maxLines?: number;
  minLines?: number;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  hasPrefixDivider?: boolean;
  isClearable?: boolean;
}

function useFieldState(defaultValue?: string) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);
  return { value, setValue, isFocused, hasValue: value.length > 0, handleFocus, handleBlur };
}

function useFieldStyles(props: DemoBottomSheetTextFieldProps, isFocused: boolean, hasValue: boolean) {
  const theme = useTheme();
  const { maxLines = 1, minLines = 1 } = props;
  const isMultiline = maxLines > 1 || minLines > 1;
  const derivedState = useMemo(
    () => deriveTextFieldState({ explicitState: props.state, isFocused, hasValue }),
    [props.state, isFocused, hasValue],
  );
  const spec = useMemo(() => resolveTextFieldColorSpec(theme.colors, derivedState), [theme.colors, derivedState]);
  const containerStyle = useMemo(
    () => buildTextFieldContainerStyle({ spec, scale: theme.scale, maxLines, minLines }),
    [spec, theme.scale, maxLines, minLines],
  );
  const inputStyle = useMemo(
    () => buildTextFieldInputStyle({
      spec, isFloating: isFocused || hasValue, isMultiline, maxLines: Math.max(maxLines, minLines),
      typography: theme.typography, scale: theme.scale,
    }),
    [spec, isFocused, hasValue, isMultiline, maxLines, minLines, theme.typography, theme.scale],
  );
  return { theme, spec, derivedState, containerStyle, inputStyle, isMultiline };
}

function FieldSlots(props: DemoBottomSheetTextFieldProps & { isFocused: boolean; hasValue: boolean; onClear: () => void; theme: ReturnType<typeof useTheme> }) {
  const { theme, prefixIcon, suffixIcon, hasPrefixDivider, isClearable, isFocused, hasValue, onClear } = props;
  const prefix = prefixIcon ? (
    <TextFieldIconSlot icon={prefixIcon} position="prefix" hasDivider={hasPrefixDivider ?? false} scale={theme.scale} dividerColor={theme.colors.strokeElements} />
  ) : null;
  const showClear = isClearable === true && isFocused && hasValue;
  const suffix = showClear
    ? <TextFieldClearButton onPress={onClear} fillColor={theme.colors.secondaryBackground} scale={theme.scale} />
    : suffixIcon ? <TextFieldIconSlot icon={suffixIcon} position="suffix" scale={theme.scale} dividerColor={theme.colors.strokeElements} /> : null;
  return { prefix, suffix };
}

function FieldInput(props: { field: ReturnType<typeof useFieldState>; styles: ReturnType<typeof useFieldStyles>; componentProps: DemoBottomSheetTextFieldProps }) {
  const { field, styles, componentProps } = props;
  return (
    <BottomSheetTextInput
      value={field.value}
      onChangeText={field.setValue}
      onFocus={field.handleFocus}
      onBlur={field.handleBlur}
      editable={componentProps.state !== "disabled"}
      secureTextEntry={componentProps.isSecureTextEntry}
      multiline={styles.isMultiline}
      style={styles.inputStyle}
      placeholderTextColor="transparent"
    />
  );
}

export function DemoBottomSheetTextField(props: DemoBottomSheetTextFieldProps) {
  const field = useFieldState(props.defaultValue);
  const styles = useFieldStyles(props, field.isFocused, field.hasValue);
  const displayLabel = styles.derivedState === "error" && props.errorMessage ? props.errorMessage : props.label;
  const handleClear = useCallback(() => field.setValue(""), [field.setValue]);
  const slots = FieldSlots({ ...props, isFocused: field.isFocused, hasValue: field.hasValue, onClear: handleClear, theme: styles.theme });
  const innerStyle = styles.isMultiline ? { flex: 1 } : { flex: 1, height: "100%" as const, justifyContent: "center" as const };

  return (
    <Pressable style={styles.containerStyle}>
      {slots.prefix}
      <View style={innerStyle}>
        <TextFieldFloatingLabel label={displayLabel} isFloating={field.isFocused || field.hasValue} isMultiline={styles.isMultiline} color={styles.spec.labelColor} typography={styles.theme.typography} scale={styles.theme.scale} />
        <FieldInput field={field} styles={styles} componentProps={props} />
      </View>
      {slots.suffix}
    </Pressable>
  );
}
