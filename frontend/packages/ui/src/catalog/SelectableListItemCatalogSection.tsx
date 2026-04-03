import { useCallback, useState } from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../components/Text";
import { HorizontalSeparator } from "../components/HorizontalSeparator";
import { SelectableListItem } from "../components/SelectableListItem";
import { CatalogSection } from "./CatalogSection";

const DEMO_ITEMS = [
  { id: "1", label: "First item" },
  { id: "2", label: "Second item (pre-selected)" },
  { id: "3", label: "Third item" },
] as const;

export function SelectableListItemCatalogSection() {
  const theme = useTheme();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set(["2"]));

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  return (
    <CatalogSection title="SelectableListItem">
      <Text variant="caption2" color={theme.colors.tertiaryText} style={{ marginBottom: theme.spacing.sm }}>
        Wraps any content with a toggleable checkbox. Tap to toggle selection.
      </Text>
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <HorizontalSeparator />
        {DEMO_ITEMS.map((item) => (
          <View key={item.id}>
            <SelectableListItem isSelected={selectedIds.has(item.id)} onToggle={() => handleToggle(item.id)}>
              <Text variant="subtitle3">{item.label}</Text>
            </SelectableListItem>
            <HorizontalSeparator />
          </View>
        ))}
      </View>
    </CatalogSection>
  );
}
