import { useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../components/Text";
import { Icon } from "../icons/Icon";
import { ListEditActionsBar } from "../components/ListEditActionsBar";
import type { ListEditAction } from "../components/ListEditActionsBar";
import { CatalogSection } from "./CatalogSection";

export function ListEditActionsBarCatalogSection() {
  const theme = useTheme();

  const demoActions = useMemo<readonly ListEditAction[]>(() => [
    { icon: (c) => <Icon name="checkmark" size={20} color={c} />, label: "Confirm", onPress: () => {} },
    { icon: (c) => <Icon name="articles" size={20} color={c} />, label: "Archive", onPress: () => {} },
    { icon: (c) => <Icon name="trash" size={20} color={c} />, label: "Delete", onPress: () => {}, color: theme.colors.attentionRed },
  ], [theme.colors.attentionRed]);

  return (
    <CatalogSection title="ListEditActionsBar">
      <Text variant="caption2" color={theme.colors.tertiaryText} style={{ marginBottom: theme.spacing.sm }}>
        Bottom action bar with icon + label actions. Last action uses danger color.
      </Text>
      <View style={{ borderRadius: theme.radii.medium, overflow: "hidden", borderWidth: 1, borderColor: theme.colors.onTertiaryFill }}>
        <ListEditActionsBar actions={demoActions} />
      </View>
    </CatalogSection>
  );
}
