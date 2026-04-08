import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import type { IconName } from "@ion/ui";

export interface TabDefinition {
  key: string;
  label: string;
  iconName: IconName;
}

interface ProfileTabBarProps {
  tabs: readonly TabDefinition[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export function ProfileTabBar({ tabs, activeIndex, onTabChange }: ProfileTabBarProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const scrollStyle = useMemo(
    () => ({
      paddingHorizontal: scale(16),
      backgroundColor: theme.colors.secondaryBackground,
    }),
    [scale, theme.colors],
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={scrollStyle}>
      <View style={[styles.row, { gap: scale(20) }]}>
        {tabs.map((tab, index) => (
          <TabItem
            key={tab.key}
            tab={tab}
            isActive={index === activeIndex}
            onPress={() => onTabChange(index)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

interface TabItemProps {
  tab: TabDefinition;
  isActive: boolean;
  onPress: () => void;
}

function TabItem({ tab, isActive, onPress }: TabItemProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const color = isActive ? theme.colors.primaryAccent : theme.colors.tertiaryText;

  const underlineStyle = useMemo(
    () => ({
      height: scale(3),
      borderTopLeftRadius: scale(4),
      borderTopRightRadius: scale(4),
      backgroundColor: isActive ? theme.colors.primaryAccent : "transparent",
      alignSelf: "stretch" as const,
    }),
    [scale, isActive, theme.colors],
  );

  return (
    <Pressable onPress={onPress} style={styles.tabItem}>
      <View style={[styles.tabContent, { gap: scale(6) }]}>
        <Icon name={tab.iconName} size={scale(18)} color={color} />
        <Text variant="subtitle3" color={color}>{tab.label}</Text>
      </View>
      <View style={underlineStyle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
  tabItem: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  tabContent: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
