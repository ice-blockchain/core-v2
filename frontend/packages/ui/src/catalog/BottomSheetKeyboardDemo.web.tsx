import { View } from "react-native";
import { Text } from "../components/Text";
import { TextField } from "../components/TextField";
import { useTheme } from "../theme/ThemeProvider";
import { BottomSheet } from "../components/BottomSheet";
import type { BottomSheetDemoProps } from "./bottom-sheet-demo-types";

export function BottomSheetKeyboardDemo({ isVisible, onClose }: BottomSheetDemoProps) {
  const theme = useTheme();
  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} title="Keyboard Demo">
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <Text variant="caption2" color={theme.colors.tertiaryText}>
          Tap a field to open keyboard.
        </Text>
        <TextField label="Recipient address" />
        <TextField label="Amount" />
      </View>
    </BottomSheet>
  );
}
