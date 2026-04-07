import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../icons/Icon";
import { Text } from "./Text";
import type { IconName } from "../icons/icon-types";
import { buildIconFrameStyle, buildFilterIconFrameStyle, buildRowStyle } from "./feed-filters-menu-item-styles";

interface FeedFiltersMenuItemProps {
  label: string;
  iconName: IconName;
  iconColor: string;
  iconBackgroundColor: string;
  isSelected: boolean;
  isFilterStyle?: boolean;
  onPress: () => void;
}

export function FeedFiltersMenuItem(props: FeedFiltersMenuItemProps) {
  const { label, iconName, iconColor, iconBackgroundColor, isSelected, isFilterStyle, onPress } = props;
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const rowStyle = useMemo(() => buildRowStyle(scale), [scale]);
  const frameStyle = useMemo(
    () =>
      isFilterStyle
        ? buildFilterIconFrameStyle({ scale, bgColor: iconBackgroundColor, borderColor: theme.colors.onTertiaryFill })
        : buildIconFrameStyle(scale, iconBackgroundColor),
    [scale, iconBackgroundColor, isFilterStyle, theme.colors],
  );

  const textVariant = isFilterStyle ? "subtitle3" : "subtitle2";

  return (
    <Pressable style={rowStyle} onPress={onPress}>
      <View style={frameStyle}>
        <Icon name={iconName} size={scale(isFilterStyle ? 18 : 20)} color={iconColor} />
      </View>
      <Text variant={textVariant} style={styles.label}>{label}</Text>
      {isSelected ? <Icon name="dapp-check" size={scale(24)} color={theme.colors.success} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { flex: 1 },
});
