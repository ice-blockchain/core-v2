import { FullscreenBottomSheet } from "@ion/ui";
import { NewChatSheetContent } from "./new-chat-sheet-content";
import type { SearchableUser } from "@ion/user-search";

const SNAP_POINTS = ["90%"];

interface NewChatSheetProps {
  readonly isVisible: boolean;
  readonly onClose: () => void;
  readonly onSelectUser: ((user: SearchableUser) => void) | undefined;
}

export function NewChatSheet({ isVisible, onClose, onSelectUser }: NewChatSheetProps) {
  return (
    <FullscreenBottomSheet isVisible={isVisible} onClose={onClose} snapPoints={SNAP_POINTS}>
      <NewChatSheetContent onClose={onClose} onSelectUser={onSelectUser} />
    </FullscreenBottomSheet>
  );
}
