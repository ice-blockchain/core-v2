import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { IconName } from "../icons/icon-types";

export type TextInputState = "empty" | "focused" | "valid" | "error";

export interface TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  prefixIcon?: IconName;
  suffixIcon?: ReactNode;
  state?: TextInputState;
  errorMessage?: string;
  maxLength?: number;
  debounceMs?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "numeric";
  secureTextEntry?: boolean;
  autoCorrect?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface BorderColors {
  border: string;
  icon: string;
  label: string;
}
