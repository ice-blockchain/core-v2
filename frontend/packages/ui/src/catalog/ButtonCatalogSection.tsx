import { View } from "react-native";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import type { ButtonColor } from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../icons/Icon";
import { CatalogSection } from "./CatalogSection";

const COLORS: ButtonColor[] = ["primary", "secondary", "secondaryB", "tertiary", "text"];

function ButtonRow({ label, children }: { label: string; children: React.ReactNode }) {
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

function LargeColorRow({ color }: { color: ButtonColor }) {
  const theme = useTheme();
  const iconColor = getIconColor(color, theme);
  return (
    <ButtonRow label={color}>
      <View style={{ width: "100%", marginBottom: 4 }}>
        <Button height={56} color={color} label="Action" icon={<Icon name="manage" color={iconColor} size={20} />} iconPosition="left" />
      </View>
      <View style={{ width: "100%", marginBottom: 4 }}>
        <Button height={56} color={color} label="Action" icon={<Icon name="manage" color={iconColor} size={20} />} iconPosition="right" />
      </View>
      <View style={{ width: "100%", marginBottom: 4 }}>
        <Button height={56} color={color} label="Action" />
      </View>
      <Button height={56} color={color} icon={<Icon name="manage" color={iconColor} size={20} />} iconPosition="center" />
    </ButtonRow>
  );
}

function LargeButtonVariants() {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.xl }}>
      <Text variant="title" style={{ marginBottom: theme.spacing.sm }}>
        Large (h=56)
      </Text>
      {COLORS.map((color) => (
        <LargeColorRow key={color} color={color} />
      ))}
      <ButtonRow label="disabled">
        <View style={{ width: "100%" }}>
          <Button height={56} color="primary" label="Disabled" isDisabled />
        </View>
      </ButtonRow>
      <ButtonRow label="loading">
        <View style={{ width: "100%" }}>
          <Button height={56} color="primary" label="Loading" isLoading />
        </View>
      </ButtonRow>
    </View>
  );
}

function SmallButtonVariants() {
  const theme = useTheme();

  return (
    <View>
      <Text variant="title" style={{ marginBottom: theme.spacing.sm }}>
        Small (h=44)
      </Text>
      {COLORS.map((color) => (
        <ButtonRow key={color} label={color}>
          <Button height={44} color={color} label="Action" icon={<Icon name="send" color={getIconColor(color, theme)} size={20} />} iconPosition="left" />
          <Button height={44} color={color} label="Action" />
        </ButtonRow>
      ))}
    </View>
  );
}

function getIconColor(color: ButtonColor, theme: { colors: { onPrimaryAccent: string; secondaryText: string; primaryText: string } }): string {
  if (color === "primary") return theme.colors.onPrimaryAccent;
  if (color === "tertiary" || color === "text") return theme.colors.secondaryText;
  return theme.colors.primaryText;
}

export function ButtonCatalogSection() {
  return (
    <CatalogSection title="Buttons">
      <LargeButtonVariants />
      <SmallButtonVariants />
    </CatalogSection>
  );
}
