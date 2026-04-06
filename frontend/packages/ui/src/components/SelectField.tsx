import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";
import { Icon } from "../icons/Icon";
import { TextFieldFloatingLabel } from "./TextFieldFloatingLabel";
import { TextFieldIconSlot } from "./TextFieldIconSlot";
import { buildTextFieldContainerStyle, resolveTextFieldColorSpec, deriveTextFieldState } from "./TextFieldStyles";
import { SelectFieldDropdown, SELECT_FIELD_Z_INDEX } from "./SelectFieldDropdown";

export interface SelectFieldProps {
  label: string;
  value: string | null;
  options: string[];
  onSelect: (value: string) => void;
  prefixIcon?: React.ReactNode;
  hasPrefixDivider?: boolean;
  style?: StyleProp<ViewStyle>;
}

function useSelectFieldState(value: string | null) {
  const [isOpen, setIsOpen] = useState(false);
  const hasValue = value !== null && value.length > 0;
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);
  return { isOpen, hasValue, toggle, close };
}

function useSelectFieldStyles(options: { isOpen: boolean; hasValue: boolean }) {
  const theme = useTheme();
  const derivedState = useMemo(
    () => deriveTextFieldState({ explicitState: undefined, isFocused: options.isOpen, hasValue: options.hasValue }),
    [options.isOpen, options.hasValue],
  );
  const spec = useMemo(() => resolveTextFieldColorSpec(theme.colors, derivedState), [theme.colors, derivedState]);
  const containerStyle = useMemo(() => buildTextFieldContainerStyle({ spec, scale: theme.scale }), [spec, theme.scale]);
  return { theme, spec, containerStyle };
}

const VALUE_PADDING_TOP = 14;

function SelectFieldValue({ value, scaleSize }: { value: string; scaleSize: (n: number) => number }) {
  return (
    <View style={{ paddingTop: scaleSize(VALUE_PADDING_TOP) }}>
      <Text variant="body">{value}</Text>
    </View>
  );
}

function renderPrefixSlot(props: SelectFieldProps, theme: ReturnType<typeof useTheme>) {
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

function renderLabelAndValue(options: { label: string; value: string | null; hasValue: boolean; isOpen: boolean; spec: ReturnType<typeof resolveTextFieldColorSpec>; theme: ReturnType<typeof useTheme> }) {
  const { label, value, hasValue, isOpen, spec, theme } = options;
  return (
    <View style={{ flex: 1, height: "100%", justifyContent: "center" }}>
      <TextFieldFloatingLabel label={label} isFloating={hasValue || isOpen} color={spec.labelColor} typography={theme.typography} scale={theme.scale} />
      {hasValue && value != null && <SelectFieldValue value={value} scaleSize={theme.scale.scaleSize} />}
    </View>
  );
}

export function SelectField(props: SelectFieldProps) {
  const { value, options, onSelect, style } = props;
  const { isOpen, hasValue, toggle, close } = useSelectFieldState(value);
  const { theme, spec, containerStyle } = useSelectFieldStyles({ isOpen, hasValue });

  const handleSelect = useCallback((selected: string) => {
    onSelect(selected);
    close();
  }, [onSelect, close]);

  return (
    <View style={[{ zIndex: SELECT_FIELD_Z_INDEX }, style]}>
      <Pressable onPress={toggle} style={containerStyle}>
        {renderPrefixSlot(props, theme)}
        {renderLabelAndValue({ label: props.label, value, hasValue, isOpen, spec, theme })}
        <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={24} color={theme.colors.tertiaryText} />
      </Pressable>
      <SelectFieldDropdown options={options} onSelect={handleSelect} isVisible={isOpen} />
    </View>
  );
}
