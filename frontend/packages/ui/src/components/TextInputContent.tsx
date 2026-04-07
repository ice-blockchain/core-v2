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
  secureTextEntry?: boolean | undefined;
  autoCorrect?: boolean | undefined;
  onFocus: () => void;
  onBlur: () => void;
  testID?: string | undefined;
}

function useContentTheme() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const keyboardAppearance = theme.colorMode === "dark" ? "dark" as const : "light" as const;
  return { scale, colors: theme.colors, keyboardAppearance };
}

export function TextInputContent(props: TextInputContentProps) {
  const { scale, colors, keyboardAppearance } = useContentTheme();
  const { showFloatingLabel, floatingLabelText, labelColor, inputStyle } = props;

  return (
    <View style={{ flex: 1, justifyContent: "center", gap: showFloatingLabel ? scale(2) : 0 }}>
      {showFloatingLabel ? (
        <Text variant="caption" style={buildFloatingLabelStyle(scale, labelColor)} numberOfLines={1} ellipsizeMode="tail">
          {floatingLabelText}
        </Text>
      ) : null}
      <RNTextInput
        value={props.value} onChangeText={props.onChangeText}
        placeholder={showFloatingLabel ? undefined : props.placeholder}
        placeholderTextColor={colors.tertiaryText} maxLength={props.maxLength}
        autoCapitalize={props.autoCapitalize} keyboardType={props.keyboardType}
        keyboardAppearance={keyboardAppearance}
        secureTextEntry={props.secureTextEntry} autoCorrect={props.autoCorrect}
        cursorColor={colors.primaryAccent} selectionColor={colors.primaryAccent}
        onFocus={props.onFocus} onBlur={props.onBlur}
        style={inputStyle} testID={props.testID}
      />
    </View>
  );
}
