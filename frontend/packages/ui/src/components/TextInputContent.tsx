import { TextInput as RNTextInput, View } from "react-native";
import type { TextStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";
import { buildFloatingLabelStyle } from "./text-input-styles";

interface TextInputContentProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  showFloatingLabel: boolean;
  floatingLabelText: string;
  labelColor: string;
  inputStyle: TextStyle;
  maxLength?: number | undefined;
  autoCapitalize?: "none" | "sentences" | "words" | "characters" | undefined;
  keyboardType?: "default" | "email-address" | "numeric" | undefined;
  onFocus: () => void;
  onBlur: () => void;
  testID?: string | undefined;
}

export function TextInputContent(props: TextInputContentProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { showFloatingLabel, floatingLabelText, labelColor, inputStyle } = props;

  return (
    <View style={{ flex: 1, justifyContent: "center", gap: showFloatingLabel ? scale(2) : 0 }}>
      {showFloatingLabel ? (
        <Text variant="caption" style={buildFloatingLabelStyle(scale, labelColor)}>
          {floatingLabelText}
        </Text>
      ) : null}
      <RNTextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={showFloatingLabel ? undefined : props.placeholder}
        placeholderTextColor={theme.colors.tertiaryText}
        maxLength={props.maxLength}
        autoCapitalize={props.autoCapitalize}
        keyboardType={props.keyboardType}
        cursorColor={theme.colors.primaryAccent}
        selectionColor={theme.colors.primaryAccent}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        style={inputStyle}
        testID={props.testID}
      />
    </View>
  );
}
