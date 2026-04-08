import { FullscreenBottomSheet } from "@ion/ui";
import { NewChatSheetContent } from "./new-chat-sheet-content";

const SNAP_POINTS = ["90%"];

interface NewChatSheetProps {
  readonly isVisible: boolean;
  readonly onClose: () => void;
}

export function NewChatSheet({ isVisible, onClose }: NewChatSheetProps) {
  return (
    <FullscreenBottomSheet isVisible={isVisible} onClose={onClose} snapPoints={SNAP_POINTS}>
      <NewChatSheetContent onClose={onClose} />
    </FullscreenBottomSheet>
  );
}
