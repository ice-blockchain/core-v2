import { View } from "react-native";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/icon-types";
import { iconRegistry } from "../icons/icon-registry";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../components/Text";
import { CatalogSection } from "./CatalogSection";

const iconNames = Object.keys(iconRegistry) as IconName[];

function IconTile({ name }: { name: IconName }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", margin: theme.spacing.sm, width: 80 }}>
      <Icon name={name} size={24} color="#000000" />
      <Text variant="caption3" color={theme.colors.tertiaryText} style={{ marginTop: 4 }}>
        {name}
      </Text>
    </View>
  );
}

function IconGrid() {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {iconNames.map((name) => (
        <IconTile key={name} name={name} />
      ))}
    </View>
  );
}

export function IconCatalogSection() {
  return (
    <CatalogSection title="Icons">
      <IconGrid />
    </CatalogSection>
  );
}
