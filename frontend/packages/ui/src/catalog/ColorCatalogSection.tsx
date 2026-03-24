import { View } from "react-native";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import { colorPalette } from "../tokens/color-palette";
import { CatalogSection } from "./CatalogSection";

interface SwatchProps {
  name: string;
  color: string;
  size: number;
}

function Swatch({ name, color, size }: SwatchProps) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", margin: 4, width: size + 20 }}>
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: theme.colors.strokeElements,
        }}
      />
      <Text variant="caption5" style={{ marginTop: 4, textAlign: "center" }}>
        {name}
      </Text>
      <Text
        variant="notificationCaption"
        color={theme.colors.tertiaryText}
        style={{ textAlign: "center" }}
      >
        {color}
      </Text>
    </View>
  );
}

function SemanticColorGrid() {
  const theme = useTheme();
  const entries = Object.entries(theme.colors);

  return (
    <View style={{ marginBottom: theme.spacing.xl }}>
      <Text variant="title" style={{ marginBottom: theme.spacing.sm }}>
        Semantic Colors
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {entries.map(([name, value]) => (
          <Swatch key={name} name={name} color={value} size={56} />
        ))}
      </View>
    </View>
  );
}

function FixedColorGrid() {
  const theme = useTheme();
  const entries = Object.entries(colorPalette);

  return (
    <View>
      <Text variant="title" style={{ marginBottom: theme.spacing.sm }}>
        Fixed Colors
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {entries.map(([name, value]) => (
          <Swatch key={name} name={name} color={value} size={56} />
        ))}
      </View>
    </View>
  );
}

export function ColorCatalogSection() {
  return (
    <CatalogSection title="Colors">
      <SemanticColorGrid />
      <FixedColorGrid />
    </CatalogSection>
  );
}
