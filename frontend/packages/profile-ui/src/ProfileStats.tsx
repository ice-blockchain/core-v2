import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, VerticalSeparator, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { PROFILE_NAMESPACE } from "./translations";

const NS = PROFILE_NAMESPACE;

interface ProfileStatsProps {
  followingCount: number;
  followersCount: number;
}

export function ProfileStats({ followingCount, followersCount }: ProfileStatsProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(
    () => ({
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: theme.colors.tertiaryBackground,
      borderRadius: scale(16),
      height: scale(36),
      paddingHorizontal: scale(16),
      gap: scale(14),
    }),
    [scale, theme.colors],
  );

  return (
    <View style={containerStyle}>
      <StatCell iconName="search-follow" count={followingCount} label={translate(`${NS}:following`)} />
      <VerticalSeparator />
      <StatCell iconName="search-followers" count={followersCount} label={translate(`${NS}:followers`)} />
    </View>
  );
}

interface StatCellProps {
  iconName: "search-follow" | "search-followers";
  count: number;
  label: string;
}

function StatCell({ iconName, count, label }: StatCellProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return (
    <View style={[styles.cell, { gap: scale(4), paddingVertical: scale(6) }]}>
      <View style={[styles.countRow, { gap: scale(4) }]}>
        <Icon name={iconName} size={scale(16)} color={theme.colors.primaryText} />
        <Text variant="body">{String(count)}</Text>
      </View>
      <Text variant="caption2" color={theme.colors.tertiaryText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  countRow: { flexDirection: "row", alignItems: "center" },
});
