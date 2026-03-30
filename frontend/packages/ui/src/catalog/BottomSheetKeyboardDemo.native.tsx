import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text } from "../components/Text";
import { Icon } from "../icons/Icon";
import { FullscreenBottomSheet } from "../components/FullscreenBottomSheet";
import { useSheetStyles } from "./bottom-sheet-demo-styles";
import { DemoBottomSheetTextField } from "./demo-bottom-sheet-text-field";
import type { BottomSheetDemoProps } from "./bottom-sheet-demo-types";

export function BottomSheetKeyboardDemo({ isVisible, onClose }: BottomSheetDemoProps) {
  const { safeBottomStyle, theme } = useSheetStyles();
  return (
    <FullscreenBottomSheet isVisible={isVisible} onClose={onClose} enableDynamicSizing>
      <BottomSheetScrollView contentContainerStyle={{ ...safeBottomStyle, padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <Text variant="headline2">Keyboard Demo</Text>
        <DemoBottomSheetTextField label="Name" />
        <DemoBottomSheetTextField
          label="Name"
          prefixIcon={<Icon name="manage" size={20} color={theme.colors.tertiaryText} />}
          hasPrefixDivider
        />
        <DemoBottomSheetTextField
          label="Name"
          suffixIcon={<Icon name="send" size={20} color={theme.colors.tertiaryText} />}
        />
      </BottomSheetScrollView>
    </FullscreenBottomSheet>
  );
}
