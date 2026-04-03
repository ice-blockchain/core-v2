import { BottomSheetView } from "@gorhom/bottom-sheet";
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
      <BottomSheetView style={{ backgroundColor: theme.colors.secondaryBackground }}>
        <DeleteChatSheetContent onCancel={onClose} onDelete={onDelete} />
      </BottomSheetView>
    </FullscreenBottomSheet>
  );
}
