import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import type {
  StyleProp,
  TextInputProps as RNTextInputProps,
  ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { Theme } from "../theme/theme-types";
import { TextFieldFloatingLabel } from "./TextFieldFloatingLabel";
import { TextFieldIconSlot } from "./TextFieldIconSlot";
import { TextFieldClearButton } from "./TextFieldClearButton";
import {
  buildTextFieldContainerStyle,
  buildTextFieldInputStyle,
  buildMultilineWrapperStyle,
  deriveTextFieldState,
  resolveTextFieldColorSpec,
} from "./TextFieldStyles";
import type { TextFieldColorSpec, TextFieldTextVariant } from "./TextFieldStyles";

export interface TextFieldProps {
  label: string;
  value?: string;
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  state?: "error" | "verified" | "disabled";
  errorMessage?: string;
  isSecureTextEntry?: boolean;
  textVariant?: TextFieldTextVariant;
  minLines?: number;
  maxLines?: number;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  hasPrefixDivider?: boolean;
  isClearable?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
  textInputProps?: TextFieldPassthroughProps;
}

type TextFieldPassthroughProps = Omit<
  RNTextInputProps,
  "value" | "onChangeText" | "onFocus" | "onBlur" | "editable" | "style" | "secureTextEntry" | "multiline"
>;

function useTextFieldValue(props: TextFieldProps) {
  const { value, defaultValue, onChangeText } = props;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const currentValue = isControlled ? (value ?? "") : internalValue;

  const handleChangeText = useCallback((text: string) => {
    if (!isControlled) setInternalValue(text);
    onChangeText?.(text);
  }, [isControlled, onChangeText]);

  return { currentValue, handleChangeText };
}

function useTextFieldFocus(props: TextFieldProps) {
  const { onFocus, onBlur } = props;
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  return { isFocused, handleFocus, handleBlur };
}

const IS_WEB = Platform.OS === "web";

function useWebMultilineHeight(options: {
  isMultiline: boolean;
  ref: React.ForwardedRef<TextInput>;
  inputRef: React.RefObject<TextInput | null>;
  value: string;
}) {
  const { isMultiline, ref, inputRef, value } = options;
  useLayoutEffect(() => {
    if (!IS_WEB || !isMultiline) return;
    const node = ((ref as React.RefObject<TextInput | null>)?.current ?? inputRef.current) as unknown as HTMLTextAreaElement | null;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [isMultiline, ref, inputRef, value]);
}

function useFocusInput(ref: React.ForwardedRef<TextInput>, inputRef: React.RefObject<TextInput | null>) {
  return useCallback(() => {
    const target = (ref as React.RefObject<TextInput | null>)?.current ?? inputRef.current;
    target?.focus();
  }, [ref, inputRef]);
}

interface TextFieldStyleOptions {
  theme: Theme;
  explicitState: TextFieldProps["state"];
  isFocused: boolean;
  hasValue: boolean;
  minLines: number;
  maxLines: number;
  textVariant?: TextFieldTextVariant;
}

function useTextFieldStyles(options: TextFieldStyleOptions) {
  const { theme, explicitState, isFocused, hasValue, minLines, maxLines, textVariant = "default" } = options;
  const isMultiline = maxLines > 1 || minLines > 1;

  const derivedState = useMemo(
    () => deriveTextFieldState({ explicitState, isFocused, hasValue }),
    [explicitState, isFocused, hasValue],
  );

  const spec = useMemo(
    () => resolveTextFieldColorSpec(theme.colors, derivedState),
    [theme.colors, derivedState],
  );

  const containerStyle = useMemo(
    () => buildTextFieldContainerStyle({ spec, scale: theme.scale, maxLines, minLines }),
    [spec, theme.scale, maxLines, minLines],
  );

  const inputStyle = useMemo(
    () => buildTextFieldInputStyle({ spec, isMultiline, maxLines: Math.max(maxLines, minLines), typography: theme.typography, scale: theme.scale, textVariant }),
    [spec, isMultiline, maxLines, minLines, theme.typography, theme.scale, textVariant],
  );

  const multilineWrapperStyle = useMemo(
    () => isMultiline ? buildMultilineWrapperStyle({ scale: theme.scale }) : undefined,
    [isMultiline, theme.scale],
  );

  return { derivedState, spec, containerStyle, inputStyle, isMultiline, multilineWrapperStyle };
}

interface RenderSlotsOptions {
  props: TextFieldProps;
  theme: Theme;
  spec: TextFieldColorSpec;
  shouldShowClear: boolean;
  onClear: () => void;
}

function renderPrefixSlot(options: RenderSlotsOptions) {
  const { props, theme } = options;
  if (props.prefixIcon == null) return null;
  return (
    <TextFieldIconSlot
      icon={props.prefixIcon}
      position="prefix"
      hasDivider={props.hasPrefixDivider ?? false}
      scale={theme.scale}
      dividerColor={theme.colors.strokeElements}
    />
  );
}

function renderSuffixSlot(options: RenderSlotsOptions) {
  const { props, theme, shouldShowClear, onClear } = options;
  if (shouldShowClear) {
    return (
      <TextFieldClearButton
        onPress={onClear}
        fillColor={theme.colors.secondaryBackground}
        scale={theme.scale}
      />
    );
  }
  if (props.suffixIcon == null) return null;
  return (
    <TextFieldIconSlot
      icon={props.suffixIcon}
      position="suffix"
      scale={theme.scale}
      dividerColor={theme.colors.strokeElements}
    />
  );
}

interface TextFieldInternalState {
  theme: Theme;
  currentValue: string;
  handleChangeText: (text: string) => void;
  isFocused: boolean;
  handleFocus: () => void;
  handleBlur: () => void;
}

function useTextFieldState(props: TextFieldProps): TextFieldInternalState {
  const theme = useTheme();
  const { currentValue, handleChangeText } = useTextFieldValue(props);
  const { isFocused, handleFocus, handleBlur } = useTextFieldFocus(props);
  return { theme, currentValue, handleChangeText, isFocused, handleFocus, handleBlur };
}

interface TextFieldInputOptions {
  ref: React.ForwardedRef<TextInput>;
  inputRef: React.RefObject<TextInput | null>;
  props: TextFieldProps;
  internal: TextFieldInternalState;
  inputStyle: ReturnType<typeof buildTextFieldInputStyle>;
  isMultiline: boolean;
}

function renderTextInput(options: TextFieldInputOptions) {
  const { ref, inputRef, props, internal, inputStyle, isMultiline } = options;
  return (
    <TextInput
      ref={ref ?? inputRef}
      value={internal.currentValue}
      onChangeText={internal.handleChangeText}
      onFocus={internal.handleFocus}
      onBlur={internal.handleBlur}
      editable={props.state !== "disabled"}
      secureTextEntry={props.isSecureTextEntry}
      multiline={isMultiline}
      numberOfLines={IS_WEB && isMultiline ? 1 : undefined}
      keyboardAppearance={internal.theme.colorMode === "dark" ? "dark" : "light"}
      style={inputStyle}
      placeholderTextColor="transparent"
      {...props.textInputProps}
    />
  );
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  function TextField(props, ref) {
    const inputRef = useRef<TextInput>(null);
    const internal = useTextFieldState(props);
    const { theme, currentValue, isFocused } = internal;
    const { state: explicitState, maxLines = 1, minLines = 1, errorMessage, label } = props;
    const hasValue = currentValue.length > 0;

    const { derivedState, spec, containerStyle, inputStyle, isMultiline, multilineWrapperStyle } = useTextFieldStyles({
      theme, explicitState, isFocused, hasValue, minLines, maxLines, textVariant: props.textVariant ?? "default",
    });
    useWebMultilineHeight({ isMultiline, ref, inputRef, value: currentValue });

    const displayLabel = derivedState === "error" && errorMessage ? errorMessage : label;
    const shouldShowClear = props.isClearable === true && isFocused && hasValue;
    const handleClear = useCallback(() => internal.handleChangeText(""), [internal.handleChangeText]);
    const focusInput = useFocusInput(ref, inputRef);
    const slotOptions: RenderSlotsOptions = { props, theme, spec, shouldShowClear, onClear: handleClear };
    const innerStyle = isMultiline ? { flex: 1 } : { flex: 1, height: "100%" as const, justifyContent: "center" as const };
    const inputOptions: TextFieldInputOptions = { ref, inputRef, props, internal, inputStyle, isMultiline };

    return (
      <Pressable onPress={focusInput} style={[containerStyle, props.style]}>
        {renderPrefixSlot(slotOptions)}
        <View style={innerStyle}>
          <TextFieldFloatingLabel label={displayLabel} isFloating={isFocused || hasValue} isMultiline={isMultiline} color={spec.labelColor} typography={theme.typography} scale={theme.scale} />
          {multilineWrapperStyle
            ? <View style={multilineWrapperStyle}>{renderTextInput(inputOptions)}</View>
            : renderTextInput(inputOptions)}
        </View>
        {renderSuffixSlot(slotOptions)}
      </Pressable>
    );
  },
);
