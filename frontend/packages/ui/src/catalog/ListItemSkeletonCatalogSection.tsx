import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../components/Text";
import { HorizontalSeparator } from "../components/HorizontalSeparator";
import { ListItemSkeleton } from "../components/ListItemSkeleton";
import { SkeletonPulse } from "../components/SkeletonPulse";
import { CatalogSection } from "./CatalogSection";

const DEMO_ROWS = [
  { nameWidth: 221, messageWidth: 174 },
  { nameWidth: 195, messageWidth: 148 },
  { nameWidth: 124, messageWidth: 197 },
];

export function ListItemSkeletonCatalogSection() {
  const theme = useTheme();

  return (
    <CatalogSection title="SkeletonPulse + ListItemSkeleton">
      <Text variant="caption2" color={theme.colors.tertiaryText} style={{ marginBottom: theme.spacing.sm }}>
        SkeletonPulse wraps any skeleton content with a pulse animation
      </Text>
      <SkeletonPulse>
        <View style={{ gap: theme.spacing.sm }}>
          {DEMO_ROWS.map((row, index) => (
            <View key={index} style={{ gap: theme.spacing.sm }}>
              <HorizontalSeparator />
              <ListItemSkeleton nameWidth={row.nameWidth} messageWidth={row.messageWidth} />
            </View>
          ))}
          <HorizontalSeparator />
        </View>
      </SkeletonPulse>
    </CatalogSection>
  );
}
