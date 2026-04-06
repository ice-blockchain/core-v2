import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../icons/Icon";
import { Avatar } from "./Avatar";
import { BottomNavBarBadge } from "./BottomNavBarBadge";
import { buildTabSlotStyle, buildProfileRingStyle, buildProfileContainerStyle } from "./bottom-nav-bar-styles";
import type { BottomNavBarTabConfig } from "./bottom-nav-bar-types";

interface BottomNavBarTabProps {
  config: BottomNavBarTabConfig;
  isSelected: boolean;
  onPress: () => void;
}

const TAB_SLOT_STYLE = buildTabSlotStyle();

function TabIcon({ config, isSelected }: { config: BottomNavBarTabConfig; isSelected: boolean }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const iconColor = isSelected ? theme.colors.primaryAccent : theme.colors.tertiaryText;

  if (config.avatar) {
    return <ProfileTabIcon config={config} isSelected={isSelected} />;
  }

  if (!config.iconName) return null;

  return <Icon name={config.iconName} size={scale(24)} color={iconColor} />;
}

function ProfileTabIcon({ config, isSelected }: { config: BottomNavBarTabConfig; isSelected: boolean }) {
  const { colors, scale: { scaleSize } } = useTheme();
  const ringColor = isSelected ? colors.primaryAccent : colors.tertiaryText;
  const containerStyle = useMemo(() => buildProfileContainerStyle(scaleSize), [scaleSize]);
  const ringStyle = useMemo(() => buildProfileRingStyle(scaleSize, ringColor), [scaleSize, ringColor]);

  return (
    <View style={containerStyle}>
      <View style={ringStyle} />
      <Avatar size={16} {...(config.avatar?.imageUrl ? { imageUrl: config.avatar.imageUrl } : {})} fallback={config.avatar?.fallback} borderRadius={4} />
    </View>
  );
}

export function BottomNavBarTab({ config, isSelected, onPress }: BottomNavBarTabProps) {
  const hasBadge = (config.badgeCount ?? 0) > 0;

  return (
    <Pressable
      style={TAB_SLOT_STYLE}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={config.label}
    >
      <View>
        <TabIcon config={config} isSelected={isSelected} />
        {hasBadge ? <BottomNavBarBadge count={config.badgeCount!} /> : null}
      </View>
    </Pressable>
  );
}
