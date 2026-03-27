import { View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import { FullscreenBottomSheet } from "../components/FullscreenBottomSheet";
import { useSheetStyles } from "./bottom-sheet-demo-styles";
import type { BottomSheetDemoProps } from "./bottom-sheet-demo-types";

const ITEMS = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);
const SNAP_POINTS = ["80%"];

function ListHeader() {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
      <Text variant="headline2">Scrollable List</Text>
      <Text variant="caption2" color={theme.colors.tertiaryText}>50 items. Header stays fixed, content scrolls.</Text>
    </View>
  );
}

function ListItem({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing.sm, backgroundColor: theme.colors.tertiaryBackground, borderRadius: theme.scale.scaleRadius(12) }}>
      <Text variant="body">{label}</Text>
    </View>
  );
}

export function BottomSheetScrollableDemo({ isVisible, onClose }: BottomSheetDemoProps) {
  const { safeBottomStyle, theme } = useSheetStyles();
  return (
    <FullscreenBottomSheet isVisible={isVisible} onClose={onClose} snapPoints={SNAP_POINTS}>
      <ListHeader />
      <BottomSheetScrollView contentContainerStyle={{ ...safeBottomStyle, paddingHorizontal: theme.spacing.md, gap: theme.spacing.xs }}>
        {ITEMS.map((item) => <ListItem key={item} label={item} />)}
      </BottomSheetScrollView>
    </FullscreenBottomSheet>
  );
}
