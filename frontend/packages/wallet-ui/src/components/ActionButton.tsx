import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import type { IconName } from "@ion/ui";
import { buildIconContainerStyle } from "./action-button-styles";

interface ActionButtonProps {
  iconName: IconName;
  label: string;
  filled?: boolean;
  onPress?: () => void;
}

export function ActionButton({ iconName, label, filled, onPress }: ActionButtonProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const iconContainerStyle = useMemo(
    () => buildIconContainerStyle({ scale, scaleRadius: theme.scale.scaleRadius, filled, colors: theme.colors }),
    [scale, theme.scale.scaleRadius, filled, theme.colors],
  );

  const containerStyle = useMemo(
    () => ({ width: scale(80), gap: scale(6) }),
    [scale],
  );

  const iconColor = filled ? theme.colors.onPrimaryAccent : theme.colors.primaryAccent;

  return (
    <TouchableOpacity style={[styles.container, containerStyle]} accessibilityLabel={label} accessibilityRole="button" onPress={onPress}>
      <View style={[styles.iconContainer, iconContainerStyle]}>
        <Icon name={iconName} size={scale(24)} color={iconColor} />
      </View>
      <Text variant="body2" color={theme.colors.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  iconContainer: { alignItems: "center", justifyContent: "center" },
});
