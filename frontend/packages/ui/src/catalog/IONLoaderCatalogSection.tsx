import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../components/Text";
import { IONLoader } from "../components/IONLoader";
import { CatalogSection } from "./CatalogSection";

function DemoRow({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text variant="caption2" color={theme.colors.tertiaryText} style={{ marginBottom: theme.spacing.xs }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        {children}
      </View>
    </View>
  );
}

function VariantDemo() {
  return (
    <DemoRow label="Variants (light = dark petals, dark = white petals on dark bg)">
      <IONLoader variant="light" size={40} />
      <View style={{ backgroundColor: "#1a1a2e", borderRadius: 8, padding: 12 }}>
        <IONLoader variant="dark" size={40} />
      </View>
    </DemoRow>
  );
}

function SizeDemo() {
  return (
    <DemoRow label="Sizes (20, 40, 60)">
      <IONLoader variant="light" size={20} />
      <IONLoader variant="light" size={40} />
      <IONLoader variant="light" size={60} />
    </DemoRow>
  );
}

export function IONLoaderCatalogSection() {
  return (
    <CatalogSection title="IONLoader">
      <VariantDemo />
      <SizeDemo />
    </CatalogSection>
  );
}
