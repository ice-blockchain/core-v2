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
  testID?: string;
}

interface ContainerStyleOptions {
  scale: (n: number) => number;
  strokeColor: string;
  isFocused: boolean;
  accentColor: string;
}

function buildContainerStyle(options: ContainerStyleOptions): ViewStyle {
  const { scale, strokeColor, isFocused, accentColor } = options;
  return {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: isFocused ? accentColor : strokeColor,
    borderRadius: scale(16),
    backgroundColor: "white",
    height: scale(44),
    paddingHorizontal: scale(12),
    gap: scale(8),
  };
}

function buildInputStyle(scale: (n: number) => number, primaryText: string): TextStyle {
  return {
    flex: 1,
    fontSize: scale(13),
    fontFamily: "Noto Sans",
    fontWeight: "400",
    color: primaryText,
    paddingVertical: 0,
    paddingHorizontal: 0,
  };
}

function useSearchBarStyles(isFocused: boolean) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(
    () => buildContainerStyle({
      scale, strokeColor: theme.colors.strokeElements,
      isFocused, accentColor: theme.colors.primaryAccent,
    }),
    [scale, theme.colors, isFocused],
  );

  const inputStyle = useMemo(
    () => buildInputStyle(scale, theme.colors.primaryText),
    [scale, theme.colors.primaryText],
  );

  return { containerStyle, inputStyle, theme, scale };
}

export function SearchBar(props: SearchBarProps) {
  const { value, onChangeText, placeholder = "Search", style, testID } = props;
  const [isFocused, setIsFocused] = useState(false);
  const { containerStyle, inputStyle, theme, scale } = useSearchBarStyles(isFocused);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  return (
    <View style={[containerStyle, style]}>
      <Icon name="search" size={scale(20)} color={theme.colors.tertiaryText} />
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.tertiaryText}
        cursorColor={theme.colors.primaryAccent}
        selectionColor={theme.colors.primaryAccent}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={inputStyle}
        testID={testID}
      />
    </View>
  );
}
