"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SafeAreaWrapper } from "../components/SafeAreaWrapper";
import { DismissKeyboardView } from "../components/DismissKeyboardView";
import { ThemeProvider } from "../theme/ThemeProvider";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";
import type { ColorMode } from "../theme/theme-types";
import { ColorCatalogSection } from "./ColorCatalogSection";
import { TypographyCatalogSection } from "./TypographyCatalogSection";
import { IconCatalogSection } from "./IconCatalogSection";
import { ButtonCatalogSection } from "./ButtonCatalogSection";
import { SmallButtonCatalogSection } from "./SmallButtonCatalogSection";
import { TextFieldCatalogSection } from "./TextFieldCatalogSection";
import { NotificationBarCatalogSection } from "./NotificationBarCatalogSection";
import { IONLoaderCatalogSection } from "./IONLoaderCatalogSection";
import { AvatarCatalogSection } from "./AvatarCatalogSection";
import { BottomSheetCatalogSection } from "./BottomSheetCatalogSection";
import { SeparatorCatalogSection } from "./SeparatorCatalogSection";
import { ListItemSkeletonCatalogSection } from "./ListItemSkeletonCatalogSection";
import { NotificationBarProvider } from "../components/NotificationBarProvider";

function CatalogHeader({ onToggleMode }: { onToggleMode: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.xxl }}>
      <Text variant="headline1">UI Kit Catalog</Text>
      <Button height={44} color="secondary" label={theme.colorMode === "light" ? "Dark Mode" : "Light Mode"} onPress={onToggleMode} />
    </View>
  );
}

interface CatalogContentProps {
  onToggleMode: () => void;
  headerSlot?: ReactNode;
}

function CatalogContent({ onToggleMode, headerSlot }: CatalogContentProps) {
  const theme = useTheme();
  return (
    <SafeAreaWrapper edges={["bottom", "left", "right"]}>
      <DismissKeyboardView>
        <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, alignItems: "center" }}>
          <View style={{ maxWidth: 420, width: "100%" }}>
            <CatalogHeader onToggleMode={onToggleMode} />
            {headerSlot}
            <ColorCatalogSection />
            <TypographyCatalogSection />
            <IconCatalogSection />
            <ButtonCatalogSection />
            <SmallButtonCatalogSection />
            <TextFieldCatalogSection />
            <NotificationBarCatalogSection />
            <IONLoaderCatalogSection />
            <SeparatorCatalogSection />
            <ListItemSkeletonCatalogSection />
            <BottomSheetCatalogSection />
            <AvatarCatalogSection />
          </View>
        </ScrollView>
      </DismissKeyboardView>
    </SafeAreaWrapper>
  );
}

export function CatalogScreen({ headerSlot }: { headerSlot?: ReactNode }) {
  const [colorMode, setColorMode] = useState<ColorMode>("light");

  function toggleColorMode() {
    setColorMode((prev) => (prev === "light" ? "dark" : "light"));
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider colorMode={colorMode}>
        <NotificationBarProvider>
          <CatalogContent onToggleMode={toggleColorMode} headerSlot={headerSlot} />
        </NotificationBarProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
