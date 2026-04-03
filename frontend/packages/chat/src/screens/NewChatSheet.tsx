import { View } from "react-native";
import { FullscreenBottomSheet, useTheme } from "@ion/ui";
import { NewChatSheetContent } from "./new-chat-sheet-content";
import { buildContentStyle } from "./new-chat-sheet-styles";

interface NewChatSheetProps {
  readonly isVisible: boolean;
  readonly onClose: () => void;
}

export function NewChatSheet({ isVisible, onClose }: NewChatSheetProps) {
  const theme = useTheme();

  return (
    <FullscreenBottomSheet isVisible={isVisible} onClose={onClose}>
      <View style={[buildContentStyle(), { backgroundColor: theme.colors.secondaryBackground }]}>
        <NewChatSheetContent onClose={onClose} />
      </View>
    </FullscreenBottomSheet>
  );
}
