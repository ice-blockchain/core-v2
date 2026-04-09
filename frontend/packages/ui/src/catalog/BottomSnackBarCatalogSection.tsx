import { useState } from "react";
import { useTheme } from "../theme/ThemeProvider";
import { View } from "react-native";
import { Button } from "../components/Button";
import { BottomSnackBar } from "../components/BottomSnackBar";
import { CatalogSection } from "./CatalogSection";

export function BottomSnackBarCatalogSection() {
  const [isVisible, setIsVisible] = useState(false);
  const theme = useTheme();

  return (
    <CatalogSection title="Bottom Snack Bar">
      <Button
        height={44}
        color="primary"
        label="Show Snack Bar"
        onPress={() => setIsVisible(true)}
      />
      <View style={{ marginTop: theme.spacing.lg }}>
        <BottomSnackBar
          message="Buy crypto easily. Coming soon."
          isVisible={isVisible}
          onDismiss={() => setIsVisible(false)}
        />
      </View>
    </CatalogSection>
  );
}