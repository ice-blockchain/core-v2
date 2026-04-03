import { View } from "react-native";
import { FullscreenBottomSheet, useTheme } from "@ion/ui";
import { DeleteChatSheetContent } from "./delete-chat-sheet-content";

interface DeleteChatSheetProps {
  readonly isVisible: boolean;
  readonly onClose: () => void;
  readonly onDelete: () => void;
}

export function DeleteChatSheet({ isVisible, onClose, onDelete }: DeleteChatSheetProps) {
  const theme = useTheme();

  return (
    <FullscreenBottomSheet isVisible={isVisible} onClose={onClose} enableDynamicSizing>
      <View style={{ backgroundColor: theme.colors.secondaryBackground }}>
        <DeleteChatSheetContent onCancel={onClose} onDelete={onDelete} />
      </View>
    </FullscreenBottomSheet>
  );
}
