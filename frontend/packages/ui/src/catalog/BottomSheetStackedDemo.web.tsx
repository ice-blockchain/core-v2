import { View } from "react-native";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";
import { BottomSheet } from "../components/BottomSheet";
import type { BottomSheetDemoProps } from "./bottom-sheet-demo-types";

export function BottomSheetStackedDemo({ isVisible, onClose }: BottomSheetDemoProps) {
  const theme = useTheme();
  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} title="Stacked Demo">
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <Text variant="body">Stacking is a native-only demo.</Text>
        <Button height={44} color="secondary" label="Close" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}
