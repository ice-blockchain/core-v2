import { type ReactNode, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";
import { useTheme } from "@ion/ui";
import type { SemanticColors } from "@ion/ui";

interface FormInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
  label?: string;
  errorMessage?: string | null;
  onBlur?: () => void;
  onFocus?: () => void;
}

function buildBaseStyle(colors: SemanticColors): ViewStyle {
  return {
    width: 287,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.secondaryBackground,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
  };
}

function buildSeparatorStyle(color: string): ViewStyle {
  return { width: 1, height: 26, backgroundColor: color, marginHorizontal: 16, flexShrink: 0 };
}

function buildLabelStyle(color: string): TextStyle {
  return { fontWeight: "500", fontSize: 12, color, marginBottom: 2 };
}

function buildInputStyle(color: string): TextStyle {
  return { fontWeight: "600", fontSize: 13, lineHeight: 18, color, padding: 0 };
}

const iconWrapperStyle: ViewStyle = { flexShrink: 0 };
const inputColumnStyle: ViewStyle = { flex: 1, justifyContent: "center" };
const rightButtonStyle: ViewStyle = { marginLeft: 8, flexShrink: 0, alignItems: "center", justifyContent: "center" };

function LeftSection({ icon, separatorStyle }: { icon: ReactNode; separatorStyle: ViewStyle }) {
  return (
    <>
      <View style={iconWrapperStyle}>{icon}</View>
      <View style={separatorStyle} />
    </>
  );
}

function RightAction({ icon, onPress }: { icon: ReactNode; onPress?: (() => void) | undefined }) {
  return (
    <Pressable onPress={onPress} style={rightButtonStyle}>
      {icon}
    </Pressable>
  );
}

interface InputColumnProps {
  props: FormInputProps;
  setFocused: (v: boolean) => void;
  hasError: boolean;
  showLabel: boolean;
  labelText: string | null | undefined;
  labelStyle: TextStyle;
  errorLabelStyle: TextStyle;
  inputStyle: TextStyle;
  placeholderColor: string;
  keyboardAppearance: "light" | "dark";
}

function InputColumn({ props, setFocused, hasError, showLabel, labelText, labelStyle, errorLabelStyle, inputStyle, placeholderColor, keyboardAppearance }: InputColumnProps) {
  return (
    <View style={inputColumnStyle}>
      {showLabel && (
        <Text style={hasError ? errorLabelStyle : labelStyle}>{labelText}</Text>
      )}
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        onFocus={() => { setFocused(true); props.onFocus?.(); }}
        onBlur={() => { setFocused(false); props.onBlur?.(); }}
        placeholder={showLabel ? "" : props.placeholder}
        placeholderTextColor={placeholderColor}
        secureTextEntry={props.secureTextEntry}
        textContentType="oneTimeCode"
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
        keyboardAppearance={keyboardAppearance}
        style={inputStyle}
      />
    </View>
  );
}

export function FormInput(props: FormInputProps) {
  const theme = useTheme();
  const { colors } = theme;
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(props.errorMessage);
  const showLabel = focused || props.value.length > 0 || hasError;
  const borderColor = hasError ? colors.attentionRed : focused ? colors.primaryAccent : colors.strokeElements;
  const labelText = hasError ? props.errorMessage : (props.label ?? props.placeholder);

  const baseStyle = useMemo(() => buildBaseStyle(colors), [colors]);
  const separatorStyle = useMemo(() => buildSeparatorStyle(colors.strokeElements), [colors.strokeElements]);
  const labelStyle = useMemo(() => buildLabelStyle(colors.primaryAccent), [colors.primaryAccent]);
  const errorLabelStyle = useMemo(() => buildLabelStyle(colors.attentionRed), [colors.attentionRed]);
  const inputStyle = useMemo(() => buildInputStyle(colors.primaryText), [colors.primaryText]);
  const keyboardAppearance = theme.colorMode === "dark" ? "dark" as const : "light" as const;

  return (
    <View style={[baseStyle, { borderColor }]}>
      {props.leftIcon && <LeftSection icon={props.leftIcon} separatorStyle={separatorStyle} />}
      <InputColumn
        props={props} setFocused={setFocused}
        hasError={hasError} showLabel={showLabel} labelText={labelText}
        labelStyle={labelStyle} errorLabelStyle={errorLabelStyle} inputStyle={inputStyle}
        placeholderColor={colors.tertiaryText} keyboardAppearance={keyboardAppearance}
      />
      {props.rightIcon && (
        <RightAction icon={props.rightIcon} onPress={props.onRightIconPress} />
      )}
    </View>
  );
}
