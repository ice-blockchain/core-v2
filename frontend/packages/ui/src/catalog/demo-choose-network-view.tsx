import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { DemoNetworkRow } from "./demo-network-row";
import type { MockNetwork } from "./demo-mock-data";

export function DemoChooseNetworkView({ networks }: { networks: MockNetwork[] }) {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm }}>
      {networks.map((network, index) => (
        <DemoNetworkRow key={`${network.networkLabel}-${index}`} network={network} />
      ))}
    </View>
  );
}
