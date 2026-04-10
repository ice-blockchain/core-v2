import { useCallback, useMemo, useState } from "react";
import { TextInput as RNTextInput, View } from "react-native";
import type { StyleProp, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../icons/Icon";

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
  testID?: string;
}

function buildContainerStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: scale(16),
    backgroundColor,
    height: scale(36),
    paddingHorizontal: scale(12),
    gap: scale(6),
  };
}

function buildInputStyle(scale: (n: number) => number, primaryText: string): TextStyle {
  return {
    flex: 1,
    fontSize: scale(13),
    fontFamily: "NotoSans-SemiBold",
    color: primaryText,
    paddingVertical: 0,
    paddingHorizontal: 0,
  };
}

function useSearchBarStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(
    () => buildContainerStyle(scale, theme.colors.primaryBackground),
    [scale, theme.colors.primaryBackground],
  );

  const inputStyle = useMemo(
    () => buildInputStyle(scale, theme.colors.primaryText),
    [scale, theme.colors.primaryText],
  );

  return { containerStyle, inputStyle, theme, scale };
}

export function SearchBar(props: SearchBarProps) {
  const { value, onChangeText, placeholder = "Search", style, autoFocus, testID } = props;
  const { containerStyle, inputStyle, theme, scale } = useSearchBarStyles();
  const [isFocused, setIsFocused] = useState(false);
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  const focusedBorder = useMemo(() => (
    isFocused ? { borderWidth: 1, borderColor: theme.colors.primaryAccent } : null
  ), [isFocused, theme.colors.primaryAccent]);

  return (
    <View style={[containerStyle, focusedBorder, style]}>
      <Icon name="field-search" size={scale(16)} color={theme.colors.tertiaryText} />
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.tertiaryText}
        keyboardAppearance={theme.colorMode === "dark" ? "dark" : "light"}
        cursorColor={theme.colors.primaryAccent}
        selectionColor={theme.colors.primaryAccent}
        autoFocus={autoFocus}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={inputStyle}
        testID={testID}
      />
    </View>
  );
}
