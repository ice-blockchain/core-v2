import { View } from "react-native";
import { Text } from "../components/Text";
import { SmallButton } from "../components/SmallButton";
import type { SmallButtonColor } from "../components/SmallButton";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../icons/Icon";
import { CatalogSection } from "./CatalogSection";

const COLORS: SmallButtonColor[] = ["primary", "primaryOutlined", "danger", "dangerOutlined"];

function SmallButtonRow({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text variant="caption2" color={theme.colors.tertiaryText} style={{ marginBottom: theme.spacing.xs }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {children}
      </View>
    </View>
  );
}

function getIconColor(color: SmallButtonColor, theme: { colors: { onPrimaryAccent: string; primaryAccent: string; attentionRed: string } }): string {
  if (color === "primary" || color === "danger") return theme.colors.onPrimaryAccent;
  if (color === "primaryOutlined") return theme.colors.primaryAccent;
  return theme.colors.attentionRed;
}

function ColorVariants() {
  const theme = useTheme();
  return (
    <View>
      {COLORS.map((color) => (
        <SmallButtonRow key={color} label={color}>
          <SmallButton color={color} label="Follow" icon={<Icon name="send" color={getIconColor(color, theme)} size={16} />} />
          <SmallButton color={color} label="Follow" />
          <SmallButton color={color} icon={<Icon name="send" color={getIconColor(color, theme)} size={16} />} iconPosition="center" />
        </SmallButtonRow>
      ))}
    </View>
  );
}

function StateVariants() {
  return (
    <View>
      <SmallButtonRow label="disabled">
        <SmallButton color="primary" label="Disabled" isDisabled />
      </SmallButtonRow>
      <SmallButtonRow label="loading">
        <SmallButton color="primary" label="Loading" isLoading />
      </SmallButtonRow>
    </View>
  );
}

export function SmallButtonCatalogSection() {
  return (
    <CatalogSection title="Small Buttons">
      <ColorVariants />
      <StateVariants />
    </CatalogSection>
  );
}
