import { useCallback, useMemo, useRef } from "react";
import { Keyboard, Pressable, TextInput as RNTextInput, View } from "react-native";
import { IONLoader, Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { buildWrapperStyle, buildFieldStyle, buildInputSectionStyle } from "./active-search-bar-styles";

export interface ActiveSearchBarProps {
  value: string;
  isFocused: boolean;
  onChangeText: (text: string) => void;
  isLoading: boolean;
  onCancel: () => void;
  onFocus: () => void;
  onBlur: () => void;
  testID?: string;
}

function useActiveSearchBarStyles(isFocused: boolean) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { colors } = theme;
  return {
    wrapper: useMemo(() => buildWrapperStyle(scale), [scale]),
    field: useMemo(() => buildFieldStyle({ scale, backgroundColor: colors.primaryBackground, borderColor: colors.primaryAccent, isFocused }), [scale, colors, isFocused]),
    inputSection: useMemo(() => buildInputSectionStyle(scale), [scale]),
    inputStyle: useMemo(() => ({
      flex: 1,
      fontSize: scale(13),
      fontFamily: "NotoSans-SemiBold" as const,
      color: colors.primaryText,
      paddingVertical: 0,
      paddingHorizontal: 0,
    }), [scale, colors.primaryText]),
    theme,
    scale,
  };
}

function CancelButton({ onPress, color }: { onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text variant="caption" color={color}>{translate("userSearch:cancelButton")}</Text>
    </Pressable>
  );
}

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  styles: ReturnType<typeof useActiveSearchBarStyles>;
  onFocus: () => void;
  onBlur: () => void;
  isLoading: boolean;
  testID?: string;
}

function ClearButton({ onPress, scale }: { onPress: () => void; scale: (n: number) => number }) {
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      <Icon name="field-clearall" size={scale(20)} color="#9A9A9A" />
    </Pressable>
  );
}

function SearchInput({ value, onChangeText, styles, onFocus, onBlur, isLoading, testID }: SearchInputProps) {
  const { theme, scale } = styles;
  const inputRef = useRef<RNTextInput>(null);
  const hasText = value.length > 0;
  const handleClear = useCallback(() => { onChangeText(""); inputRef.current?.focus(); }, [onChangeText]);
  return (
    <View style={styles.field}>
      <View style={styles.inputSection}>
        <Icon name="field-search" size={scale(16)} color={theme.colors.tertiaryText} />
        <RNTextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={translate("userSearch:searchPlaceholder")}
          placeholderTextColor={theme.colors.tertiaryText}
          cursorColor={theme.colors.primaryAccent}
          selectionColor={theme.colors.primaryAccent}
          style={styles.inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
          testID={testID}
        />
      </View>
      {isLoading
        ? <IONLoader variant="light" size={scale(20)} />
        : hasText && <ClearButton onPress={handleClear} scale={scale} />
      }
    </View>
  );
}

export function ActiveSearchBar({ value, isFocused, onChangeText, isLoading, onCancel, onFocus, onBlur, testID }: ActiveSearchBarProps) {
  const styles = useActiveSearchBarStyles(isFocused || value.length > 0);
  const { theme } = styles;

  const handleCancel = useCallback(() => {
    Keyboard.dismiss();
    onCancel();
  }, [onCancel]);

  return (
    <View style={styles.wrapper}>
      <SearchInput value={value} onChangeText={onChangeText} styles={styles} onFocus={onFocus} onBlur={onBlur} isLoading={isLoading} {...(testID !== undefined ? { testID } : {})} />
      {(isFocused || value.length > 0) && <CancelButton onPress={handleCancel} color={theme.colors.primaryAccent} />}
    </View>
  );
}
