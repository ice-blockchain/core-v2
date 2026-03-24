"use client";

import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider } from "../theme/ThemeProvider";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";
import type { ColorMode } from "../theme/theme-types";
import { ColorCatalogSection } from "./ColorCatalogSection";
import { TypographyCatalogSection } from "./TypographyCatalogSection";
import { IconCatalogSection } from "./IconCatalogSection";
import { ButtonCatalogSection } from "./ButtonCatalogSection";

function CatalogContent({ onToggleMode }: { onToggleMode: () => void }) {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.primaryBackground }}>
    <ScrollView
      contentContainerStyle={{ padding: theme.spacing.lg, alignItems: "center" }}
    >
      <View style={{ maxWidth: 420, width: "100%" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.xxl }}>
          <Text variant="headline1">UI Kit Catalog</Text>
          <Button
            height={44}
            color="secondary"
            label={theme.colorMode === "light" ? "Dark Mode" : "Light Mode"}
            onPress={onToggleMode}
          />
        </View>
        <ColorCatalogSection />
        <TypographyCatalogSection />
        <IconCatalogSection />
        <ButtonCatalogSection />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

export function CatalogScreen() {
  const [colorMode, setColorMode] = useState<ColorMode>("light");

  function toggleColorMode() {
    setColorMode((prev) => (prev === "light" ? "dark" : "light"));
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider colorMode={colorMode}>
        <CatalogContent onToggleMode={toggleColorMode} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
