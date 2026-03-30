import { View } from "react-native";
import { Text } from "../components/Text";
import { Icon } from "../icons/Icon";
import { useTheme } from "../theme/ThemeProvider";
import { DemoCoinRow } from "./demo-coin-row";
import { MOCK_COINS } from "./demo-mock-data";

function MockSearchField() {
  const theme = useTheme();
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      backgroundColor: theme.colors.primaryBackground,
      borderRadius: theme.scale.scaleRadius(16),
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    }}>
      <Icon name="search" size={theme.scale.scaleSize(16)} color={theme.colors.tertiaryText} />
      <Text variant="body" color={theme.colors.tertiaryText}>Search</Text>
    </View>
  );
}

export function DemoSendCoinsView({ onSelectCoin }: { onSelectCoin: (coinName: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm }}>
      <MockSearchField />
      {MOCK_COINS.map((coin) => (
        <DemoCoinRow key={coin.ticker} coin={coin} onPress={() => onSelectCoin(coin.name)} />
      ))}
    </View>
  );
}
