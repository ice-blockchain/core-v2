import { useState } from "react";
import { View } from "react-native";
import { Button } from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";
import { CatalogSection } from "./CatalogSection";
import { BottomSheetNavigationDemo } from "./BottomSheetNavigationDemo";
import { BottomSheetScrollableDemo } from "./BottomSheetScrollableDemo";
import { BottomSheetKeyboardDemo } from "./BottomSheetKeyboardDemo";

function DemoButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.sm }}>
      <Button height={44} color="secondary" label={label} onPress={onPress} />
    </View>
  );
}

export function BottomSheetCatalogSection() {
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const open = (name: string) => setVisible((prev) => ({ ...prev, [name]: true }));
  const close = (name: string) => setVisible((prev) => ({ ...prev, [name]: false }));

  return (
    <CatalogSection title="Bottom Sheets">
      <DemoButton label="Navigation Demo" onPress={() => open("nav")} />
      <DemoButton label="Scrollable List Demo" onPress={() => open("scroll")} />
      <DemoButton label="Keyboard Demo" onPress={() => open("keyboard")} />
      <BottomSheetNavigationDemo isVisible={!!visible.nav} onClose={() => close("nav")} />
      <BottomSheetScrollableDemo isVisible={!!visible.scroll} onClose={() => close("scroll")} />
      <BottomSheetKeyboardDemo isVisible={!!visible.keyboard} onClose={() => close("keyboard")} />
    </CatalogSection>
  );
}
