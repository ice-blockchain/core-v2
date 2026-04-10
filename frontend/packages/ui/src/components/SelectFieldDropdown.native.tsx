import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import type { ViewStyle } from "react-native";
import { Text } from "./Text";
import { useTheme } from "../theme/ThemeProvider";
import type { SelectOption, SelectFieldDropdownProps } from "./select-field-dropdown-types";
import { DROPDOWN_GAP } from "./select-field-dropdown-types";

export type { SelectOption } from "./select-field-dropdown-types";
export { SELECT_FIELD_Z_INDEX } from "./select-field-dropdown-types";

interface AnchorPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

function useMeasureAnchor(anchorRef: SelectFieldDropdownProps["anchorRef"], isVisible: boolean) {
  const [position, setPosition] = useState<AnchorPosition | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    if (!isVisible) { retryCount.current = 0; return; }
    const tryMeasure = () => {
      const node = anchorRef.current;
      if (!node) return;
      const rect = (node as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect();
      if (rect && rect.width > 0) { setPosition({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }); return; }
      if (retryCount.current < 5) { retryCount.current += 1; requestAnimationFrame(tryMeasure); }
    };
    requestAnimationFrame(tryMeasure);
  }, [isVisible, anchorRef]);

  useEffect(() => { if (!isVisible) setPosition(null); }, [isVisible]);

  return position;
}

function buildDropdownStyle(options: {
  position: AnchorPosition;
  colors: { strokeElements: string; secondaryBackground: string };
  scaleSize: (n: number) => number;
  scaleRadius: (n: number) => number;
}): ViewStyle {
  const { position, colors, scaleSize, scaleRadius } = options;
  return {
    position: "absolute",
    top: position.y + position.height + scaleSize(DROPDOWN_GAP),
    left: position.x,
    width: position.width,
    borderRadius: scaleRadius(16),
    borderWidth: 1,
    borderColor: colors.strokeElements,
    backgroundColor: colors.secondaryBackground,
    paddingLeft: scaleSize(16),
    paddingRight: scaleSize(24),
    paddingVertical: scaleSize(16),
    gap: scaleSize(16),
  };
}

function OptionIconContainer({ icon, colors, scaleSize, scaleRadius }: {
  icon: ReactNode;
  colors: { secondaryBackground: string; onTertiaryFill: string };
  scaleSize: (n: number) => number;
  scaleRadius: (n: number) => number;
}) {
  const style = useMemo(() => ({
    width: scaleSize(30),
    height: scaleSize(30),
    borderRadius: scaleRadius(10),
    borderWidth: 1,
    borderColor: colors.onTertiaryFill,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  }), [scaleSize, scaleRadius, colors]);

  return <View style={style}>{icon}</View>;
}

function DropdownOption({ option, onPress, isDisabled, colors, scaleSize, scaleRadius }: {
  option: SelectOption;
  onPress: () => void;
  isDisabled: boolean;
  colors: { secondaryBackground: string; onTertiaryFill: string };
  scaleSize: (n: number) => number;
  scaleRadius: (n: number) => number;
}) {
  const rowStyle = useMemo(() => ({ flexDirection: "row" as const, alignItems: "center" as const, gap: scaleSize(10), opacity: isDisabled ? 0.5 : 1 }), [scaleSize, isDisabled]);

  return (
    <Pressable onPress={isDisabled ? undefined : onPress} disabled={isDisabled} style={rowStyle}>
      {option.icon != null && <OptionIconContainer icon={option.icon} colors={colors} scaleSize={scaleSize} scaleRadius={scaleRadius} />}
      <Text variant="body">{option.label}</Text>
    </Pressable>
  );
}

export function SelectFieldDropdown({ options, disabledOptions, onSelect, isVisible, onClose, anchorRef }: SelectFieldDropdownProps) {
  const theme = useTheme();
  const position = useMeasureAnchor(anchorRef, isVisible);

  const iconColors = useMemo(() => ({
    secondaryBackground: theme.colors.secondaryBackground,
    onTertiaryFill: theme.colors.onTertiaryFill,
  }), [theme.colors]);

  const handleBackdropPress = useCallback(() => onClose(), [onClose]);

  if (!isVisible || !position) return null;

  const dropdownStyle = buildDropdownStyle({ position, colors: theme.colors, scaleSize: theme.scale.scaleSize, scaleRadius: theme.scale.scaleRadius });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Pressable style={backdropStyle} onPress={handleBackdropPress} />
      <View style={dropdownStyle}>
        {options.map((option) => (
          <DropdownOption key={option.label} option={option} onPress={() => onSelect(option.label)} isDisabled={disabledOptions?.includes(option.label) ?? false} colors={iconColors} scaleSize={theme.scale.scaleSize} scaleRadius={theme.scale.scaleRadius} />
        ))}
      </View>
    </Modal>
  );
}

const backdropStyle = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
