import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useMemo } from "react";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";
import { HorizontalSeparator } from "./HorizontalSeparator";

export type ListEditAction = {
  readonly icon: (color: string) => ReactNode;
  readonly label: string;
  readonly onPress: () => void;
  readonly color?: string;
};

export interface ListEditActionsBarProps {
  readonly actions: readonly ListEditAction[];
  readonly style?: StyleProp<ViewStyle>;
}

function buildContainerStyle(backgroundColor: string, shadowColor: string): ViewStyle {
  return {
    backgroundColor,
    shadowColor,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  };
}

function buildActionsRowStyle(paddingHorizontal: number, paddingVertical: number): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal,
    paddingVertical,
  };
}

function buildActionStyle(gap: number): ViewStyle {
  return { flexDirection: "row", alignItems: "center", gap };
}

function ActionButton({ action, actionStyle }: { readonly action: ListEditAction; readonly actionStyle: ViewStyle }) {
  const theme = useTheme();
  const color = action.color ?? theme.colors.primaryAccent;
  return (
    <Pressable
      onPress={action.onPress}
      style={actionStyle}
      testID={`list-edit-action-${action.label.toLowerCase()}`}
    >
      {action.icon(color)}
      <Text variant="body2" color={color}>{action.label}</Text>
    </Pressable>
  );
}

export function ListEditActionsBar({ actions, style }: ListEditActionsBarProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(
    () => buildContainerStyle(theme.colors.secondaryBackground, theme.colors.shadow),
    [theme.colors.secondaryBackground, theme.colors.shadow],
  );
  const actionsRowStyle = useMemo(() => buildActionsRowStyle(scale(16), scale(16)), [scale]);
  const actionStyle = useMemo(() => buildActionStyle(scale(4)), [scale]);

  return (
    <View style={[containerStyle, style]}>
      <HorizontalSeparator />
      <View style={actionsRowStyle}>
        {actions.map((action) => (
          <ActionButton key={action.label} action={action} actionStyle={actionStyle} />
        ))}
      </View>
    </View>
  );
}
