import { Pressable, View } from "react-native";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import type { MockCoin } from "./demo-mock-data";

function CoinIcon({ color, initial }: { color: string; initial: string }) {
  const theme = useTheme();
  const size = theme.scale.scaleSize(36);
  return (
    <View style={{ width: size, height: size, borderRadius: theme.scale.scaleRadius(10), backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text variant="body" color={theme.colors.onPrimaryAccent}>{initial}</Text>
    </View>
  );
}

export function DemoCoinRow({ coin, onPress }: { coin: MockCoin; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
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
        <CoinIcon color={coin.color} initial={coin.initial} />
        <View>
          <Text variant="body">{coin.name}</Text>
          <Text variant="caption3" color={theme.colors.secondaryText}>{coin.ticker}</Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text variant="body">{coin.amount}</Text>
        <Text variant="caption3" color={theme.colors.secondaryText}>{coin.dollarValue}</Text>
      </View>
    </Pressable>
  );
}
