import type { ReactNode } from "react";
import { Keyboard, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

export interface DismissKeyboardViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const BASE_STYLE: ViewStyle = { flex: 1 };

function handleStartShouldSetResponder(): boolean {
  Keyboard.dismiss();
  return false;
}

export function DismissKeyboardView({ children, style, testID }: DismissKeyboardViewProps) {
  return (
    <View style={[BASE_STYLE, style]} onStartShouldSetResponder={handleStartShouldSetResponder} testID={testID}>
      {children}
    </View>
  );
}
