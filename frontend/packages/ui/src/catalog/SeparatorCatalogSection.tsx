import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../components/Text";
import { HorizontalSeparator } from "../components/HorizontalSeparator";
import { CatalogSection } from "./CatalogSection";

export function SeparatorCatalogSection() {
  const theme = useTheme();

  return (
    <CatalogSection title="HorizontalSeparator">
      <Text variant="caption2" color={theme.colors.tertiaryText} style={{ marginBottom: theme.spacing.sm }}>
        Gradient divider (fades to transparent at edges)
      </Text>
      <View style={{ gap: theme.spacing.lg }}>
        <HorizontalSeparator />
        <HorizontalSeparator />
        <HorizontalSeparator />
      </View>
    </CatalogSection>
  );
}
