import { View } from "react-native";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import { BottomSheet } from "../components/BottomSheet";
import type { BottomSheetDemoProps } from "./bottom-sheet-demo-types";

const ITEMS = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);

export function BottomSheetScrollableDemo({ isVisible, onClose }: BottomSheetDemoProps) {
  const theme = useTheme();
  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} title="Scrollable List">
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.xs }}>
        {ITEMS.map((item) => (
          <View key={item} style={{ padding: theme.spacing.sm, backgroundColor: theme.colors.tertiaryBackground, borderRadius: theme.radii.medium }}>
            <Text variant="body">{item}</Text>
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}
