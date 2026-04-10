import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import type { IconName } from "@ion/ui";
import { translate } from "@ion/localization";
import { PROFILE_NAMESPACE } from "./translations";

const NS = PROFILE_NAMESPACE;

interface MenuItem {
  labelKey: string;
  iconName: IconName;
}

const MENU_ITEMS: readonly MenuItem[] = [
  { labelKey: `${NS}:menuShare`, iconName: "button-share" },
  { labelKey: `${NS}:menuBookmarks`, iconName: "bookmarks" },
  { labelKey: `${NS}:menuInviteFriend`, iconName: "button-invite" },
  { labelKey: `${NS}:menuSettings`, iconName: "profile-settings" },
];

interface ProfileSettingsMenuProps {
  onItemPress: (key: string) => void;
}

export function ProfileSettingsMenu({ onItemPress }: ProfileSettingsMenuProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const rowStyle = useMemo(() => buildRowStyle(scale), [scale]);
  const firstRowStyle = useMemo(() => ({ borderTopLeftRadius: scale(16), borderTopRightRadius: scale(16) }), [scale]);
  const lastRowStyle = useMemo(() => ({ borderBottomLeftRadius: scale(16), borderBottomRightRadius: scale(16) }), [scale]);
  const dividerStyle = useMemo(() => ({ backgroundColor: theme.colors.onTertiaryFill }), [theme.colors]);

  return (
    <View>
      {MENU_ITEMS.map((item, index) => (
        <View key={item.labelKey}>
          <Pressable style={[rowStyle, index === 0 && firstRowStyle, index === MENU_ITEMS.length - 1 && lastRowStyle]}
            onPress={() => onItemPress(item.labelKey)}>
            <Text variant="subtitle3">{translate(item.labelKey)}</Text>
            <Icon name={item.iconName} size={scale(20)} color={theme.colors.quaternaryText} />
          </Pressable>
          {index < MENU_ITEMS.length - 1 && <View style={[styles.divider, dividerStyle]} />}
        </View>
      ))}
    </View>
  );
}

function buildRowStyle(scale: (n: number) => number) {
  return {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  };
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth },
});
