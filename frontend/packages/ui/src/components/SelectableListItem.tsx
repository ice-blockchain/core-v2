import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useMemo } from "react";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../icons/Icon";

export interface SelectableListItemProps {
  readonly isSelected: boolean;
  readonly onToggle: () => void;
  readonly children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

function buildContainerStyle(gap: number): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    gap,
  };
}

export function SelectableListItem({
  isSelected,
  onToggle,
  children,
  style,
}: SelectableListItemProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(
    () => buildContainerStyle(scale(10)),
    [scale],
  );

  return (
    <View style={[containerStyle, style]}>
      <Pressable onPress={onToggle} hitSlop={8} testID="selectable-list-item-toggle">
        <Icon
          name={isSelected ? "checkbox-on" : "checkbox-off"}
          size={scale(24)}
          color={theme.colors.primaryAccent}
        />
      </Pressable>
      {children}
    </View>
  );
}
