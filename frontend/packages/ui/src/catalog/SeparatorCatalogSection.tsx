import { View } from "react-native";
import { CatalogSection } from "./CatalogSection";
import { HorizontalSeparator } from "../components/HorizontalSeparator";
import { VerticalSeparator } from "../components/VerticalSeparator";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";

export function SeparatorCatalogSection() {
  const theme = useTheme();

  return (
    <CatalogSection title="Separators">
      <Text variant="caption" style={{ marginBottom: theme.spacing.sm }}>
        Horizontal (default height)
      </Text>
      <HorizontalSeparator />

      <Text variant="caption" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
        Horizontal (height: 2)
      </Text>
      <HorizontalSeparator height={2} />

      <Text variant="caption" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
        Vertical
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
        <Text variant="body">280 Following</Text>
        <VerticalSeparator />
        <Text variant="body">406 Followers</Text>
      </View>
    </CatalogSection>
  );
}
