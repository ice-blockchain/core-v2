import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";
import { Icon } from "../icons/Icon";
import { TextFieldFloatingLabel } from "./TextFieldFloatingLabel";
import { TextFieldIconSlot } from "./TextFieldIconSlot";
import { buildTextFieldContainerStyle, resolveTextFieldColorSpec, deriveTextFieldState } from "./TextFieldStyles";
import { SelectFieldDropdown } from "./SelectFieldDropdown";
import { SELECT_FIELD_Z_INDEX } from "./select-field-dropdown-types";
import type { SelectOption } from "./select-field-dropdown-types";

export type { SelectOption } from "./select-field-dropdown-types";
export { SELECT_FIELD_Z_INDEX } from "./select-field-dropdown-types";

export interface SelectFieldProps {
  label: string;
  value: string | null;
  options: string[] | SelectOption[];
  disabledOptions?: string[];
  onSelect: (value: string) => void;
  prefixIcon?: React.ReactNode;
  hasPrefixDivider?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

function normalizeOptions(options: string[] | SelectOption[]): SelectOption[] {
  if (options.length === 0) return [];
  if (typeof options[0] === "string") {
    return (options as string[]).map((label) => ({ label }));
  }
  return options as SelectOption[];
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
    () => deriveTextFieldState({ explicitState: undefined, isFocused: false, hasValue: options.hasValue }),
    [options.hasValue],
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

function renderPrefixSlot(props: SelectFieldProps, theme: ReturnType<typeof useTheme>, isActive: boolean) {
  if (props.prefixIcon == null || isActive) return null;
  if (props.hasPrefixDivider) {
    return (
      <TextFieldIconSlot
        icon={props.prefixIcon}
        position="prefix"
        hasDivider
        scale={theme.scale}
        dividerColor={theme.colors.strokeElements}
      />
    );
  }
  return <>{props.prefixIcon}</>;
}

const CHEVRON_ROTATION_DURATION = 200;

function AnimatedChevron({ isOpen, size, color }: { isOpen: boolean; size: number; color: string }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(isOpen ? 180 : 0, { duration: CHEVRON_ROTATION_DURATION });
  }, [isOpen, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }), [rotation]);

  return (
    <Animated.View style={animatedStyle}>
      <Icon name="chevron-down" size={size} color={color} />
    </Animated.View>
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
  const { value, options, onSelect, disabled, style } = props;
  const { isOpen, hasValue, toggle, close } = useSelectFieldState(value);
  const { theme, spec, containerStyle } = useSelectFieldStyles({ isOpen: !disabled && isOpen, hasValue });
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const anchorRef = useRef<View>(null);

  const handleToggle = useCallback(() => { if (!disabled) toggle(); }, [disabled, toggle]);
  const handleSelect = useCallback((selected: string) => {
    onSelect(selected);
    close();
  }, [onSelect, close]);

  return (
    <View style={[{ zIndex: SELECT_FIELD_Z_INDEX }, style]}>
      <Pressable ref={anchorRef} onPress={handleToggle} style={containerStyle} collapsable={false}>
        {renderPrefixSlot(props, theme, hasValue || isOpen)}
        {renderLabelAndValue({ label: props.label, value, hasValue, isOpen: !disabled && isOpen, spec, theme })}
        {!disabled && <AnimatedChevron isOpen={isOpen} size={theme.scale.scaleSize(24)} color={theme.colors.primaryText} />}
      </Pressable>
      {!disabled && <SelectFieldDropdown options={normalizedOptions} disabledOptions={props.disabledOptions} onSelect={handleSelect} isVisible={isOpen} onClose={close} anchorRef={anchorRef} />}
    </View>
  );
}
