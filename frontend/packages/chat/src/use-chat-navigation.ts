import { useCallback, useState } from "react";

export type ChatView = "list" | "edit" | "archive-list" | "archive-edit" | "conversation";

export function useChatNavigation(setBottomNavHidden: (hidden: boolean) => void) {
  const [activeView, setActiveView] = useState<ChatView>("list");

  const showEdit = useCallback(() => { setBottomNavHidden(true); setActiveView("edit"); }, [setBottomNavHidden]);
  const showList = useCallback(() => { setBottomNavHidden(false); setActiveView("list"); }, [setBottomNavHidden]);
  const showArchive = useCallback(() => { setBottomNavHidden(false); setActiveView("archive-list"); }, [setBottomNavHidden]);
  const showArchiveEdit = useCallback(() => { setBottomNavHidden(true); setActiveView("archive-edit"); }, [setBottomNavHidden]);
  const showArchiveList = useCallback(() => { setBottomNavHidden(false); setActiveView("archive-list"); }, [setBottomNavHidden]);
  const showConversation = useCallback(() => { setBottomNavHidden(true); setActiveView("conversation"); }, [setBottomNavHidden]);

  return { activeView, showEdit, showList, showArchive, showArchiveEdit, showArchiveList, showConversation };
}
