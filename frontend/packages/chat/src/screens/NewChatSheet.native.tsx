import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { FullscreenBottomSheet, useTheme } from "@ion/ui";
import { NewChatSheetContent } from "./new-chat-sheet-content";

const SNAP_POINTS = ["90%"];

interface NewChatSheetProps {
  readonly isVisible: boolean;
  readonly onClose: () => void;
}

export function NewChatSheet({ isVisible, onClose }: NewChatSheetProps) {
  const theme = useTheme();

  return (
    <FullscreenBottomSheet isVisible={isVisible} onClose={onClose} snapPoints={SNAP_POINTS}>
      <BottomSheetScrollView
        contentContainerStyle={{ flexGrow: 1, backgroundColor: theme.colors.secondaryBackground }}
      >
        <NewChatSheetContent onClose={onClose} />
      </BottomSheetScrollView>
    </FullscreenBottomSheet>
  );
}
