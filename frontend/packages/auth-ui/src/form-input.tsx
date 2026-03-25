import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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

function LeftSection({ icon }: { icon: ReactNode }) {
  return (
    <>
      <View style={styles.iconWrapper}>{icon}</View>
      <View style={styles.separator} />
    </>
  );
}

function RightAction({ icon, onPress }: { icon: ReactNode; onPress?: (() => void) | undefined }) {
  return (
    <Pressable onPress={onPress} style={styles.rightButton}>
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
}

function InputColumn({ props, setFocused, hasError, showLabel, labelText }: InputColumnProps) {
  return (
    <View style={styles.inputColumn}>
      {showLabel && (
        <Text style={hasError ? styles.errorLabel : styles.label}>{labelText}</Text>
      )}
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        onFocus={() => { setFocused(true); props.onFocus?.(); }}
        onBlur={() => { setFocused(false); props.onBlur?.(); }}
        placeholder={showLabel ? "" : props.placeholder}
        placeholderTextColor="#9A9A9A"
        secureTextEntry={props.secureTextEntry}
        textContentType="oneTimeCode"
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
        style={styles.input}
      />
    </View>
  );
}

export function FormInput(props: FormInputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(props.errorMessage);
  const showLabel = focused || props.value.length > 0 || hasError;
  const borderColor = hasError ? "#FD4E4E" : focused ? "#0166FF" : "#CCCCCC";
  const labelText = hasError ? props.errorMessage : (props.label ?? props.placeholder);

  return (
    <View style={[styles.base, { borderColor }]}>
      {props.leftIcon && <LeftSection icon={props.leftIcon} />}
      <InputColumn
        props={props} setFocused={setFocused}
        hasError={hasError} showLabel={showLabel} labelText={labelText}
      />
      {props.rightIcon && (
        <RightAction icon={props.rightIcon} onPress={props.onRightIconPress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 287,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  iconWrapper: {
    flexShrink: 0,
  },
  separator: {
    width: 1,
    height: 26,
    backgroundColor: "#CCCCCC",
    marginHorizontal: 16,
    flexShrink: 0,
  },
  inputColumn: {
    flex: 1,
    justifyContent: "center",
  },
  label: {
    fontWeight: "500",
    fontSize: 12,
    color: "#0166FF",
    marginBottom: 2,
  },
  input: {
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 18,
    color: "#0E0E0E",
    padding: 0,
  },
  rightButton: {
    marginLeft: 8,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  errorLabel: {
    fontWeight: "500",
    fontSize: 12,
    color: "#FD4E4E",
    marginBottom: 2,
  },
});
