import { Pressable, View } from "react-native";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import type { MockNetwork } from "./demo-mock-data";

function NetworkBadge({ color }: { color: string }) {
  const theme = useTheme();
  const badgeSize = theme.scale.scaleSize(16);
  const coinSize = theme.scale.scaleSize(36);
  return (
    <View style={{ width: coinSize, height: coinSize, borderRadius: theme.scale.scaleRadius(10), backgroundColor: "#26A17B", alignItems: "center", justifyContent: "center" }}>
      <Text variant="caption3" color={theme.colors.onPrimaryAccent}>T</Text>
      <View style={{ position: "absolute", bottom: -3, right: -3, width: badgeSize, height: badgeSize, borderRadius: theme.scale.scaleRadius(4), backgroundColor: color }} />
    </View>
  );
}

function NetworkPill({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={{ backgroundColor: theme.colors.primaryBackground, paddingHorizontal: theme.spacing.xxs, paddingVertical: 2, borderRadius: theme.scale.scaleRadius(16) }}>
      <Text variant="caption5" color={theme.colors.quaternaryText}>{label}</Text>
    </View>
  );
}

export function DemoNetworkRow({ network }: { network: MockNetwork }) {
  const theme = useTheme();
  return (
    <Pressable
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.tertiaryBackground,
        borderRadius: theme.scale.scaleRadius(16),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <NetworkBadge color={network.networkColor} />
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xxs }}>
            <Text variant="body">{network.name}</Text>
            <NetworkPill label={network.networkLabel} />
          </View>
          <Text variant="caption3" color={theme.colors.secondaryText}>{network.ticker}</Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text variant="body">{network.amount}</Text>
        <Text variant="caption3" color={theme.colors.secondaryText}>{network.dollarValue}</Text>
      </View>
    </Pressable>
  );
}
