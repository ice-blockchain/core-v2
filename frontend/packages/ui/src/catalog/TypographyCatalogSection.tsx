import { View } from "react-native";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import type { TypographyVariantName } from "../theme/theme-types";
import { CatalogSection } from "./CatalogSection";

const VARIANT_NAMES: TypographyVariantName[] = [
  "headline1",
  "headline2",
  "title",
  "subtitle",
  "subtitle2",
  "subtitle3",
  "body",
  "body2",
  "caption",
  "caption2",
  "caption3",
  "caption4",
  "caption5",
  "caption6",
  "notificationCaption",
];

function TypographyRow({ variant }: { variant: TypographyVariantName }) {
  const theme = useTheme();
  const spec = theme.typography[variant];
  const meta = `${spec.fontWeight} / ${spec.fontSize}px`;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.strokeElements,
      }}
    >
      <View style={{ width: 160 }}>
        <Text variant="caption2" color={theme.colors.tertiaryText}>
          {variant}
        </Text>
        <Text variant="caption5" color={theme.colors.tertiaryText}>
          {meta}
        </Text>
      </View>
      <Text variant={variant}>The quick brown fox</Text>
    </View>
  );
}

export function TypographyCatalogSection() {
  return (
    <CatalogSection title="Typography">
      {VARIANT_NAMES.map((variant) => (
        <TypographyRow key={variant} variant={variant} />
      ))}
    </CatalogSection>
  );
}
