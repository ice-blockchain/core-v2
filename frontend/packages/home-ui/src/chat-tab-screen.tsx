import { useCallback, useEffect, useState } from "react";
import {
  ConversationsListScreen, ConversationsEditScreen, NewChatSheet,
  ArchiveListScreen, ArchiveEditScreen, useChatState, useChatNavigation,
} from "@ion/chat";
import type { Conversation } from "@ion/chat";
import { useBottomNav } from "@ion/main-tabs-ui";

export function ChatTabScreen() {
  const { setBottomNavHidden, setChatBadgeCount } = useBottomNav();
  const chat = useChatState();
  const nav = useChatNavigation(setBottomNavHidden);
  const [isNewChatVisible, setIsNewChatVisible] = useState(false);

  useEffect(() => setChatBadgeCount(chat.totalUnreadCount), [chat.totalUnreadCount, setChatBadgeCount]);
  useEffect(() => () => setBottomNavHidden(false), [setBottomNavHidden]);

  const handleConversationPress = useCallback((c: Conversation) => {
    if (c.isFolder) nav.showArchive();
  }, [nav]);

  if (nav.activeView === "edit") {
    return <ConversationsEditScreen conversations={chat.displayConversations} onDone={nav.showList} onArchive={chat.archiveConversations} onDelete={chat.deleteConversations} />;
  }
  if (nav.activeView === "archive-list") {
    return <ArchiveListScreen conversations={chat.archivedConversations} onBack={nav.showList} onEdit={nav.showArchiveEdit} />;
  }
  if (nav.activeView === "archive-edit") {
    return <ArchiveEditScreen conversations={chat.archivedConversations} onDone={nav.showArchiveList} onUnarchive={chat.unarchiveConversations} onDelete={chat.deleteArchivedConversations} />;
  }
  return (
    <>
      <ConversationsListScreen conversations={chat.conversations} archiveFolder={chat.archiveFolder} onEdit={nav.showEdit} onCompose={() => setIsNewChatVisible(true)} onConversationPress={handleConversationPress} />
      <NewChatSheet isVisible={isNewChatVisible} onClose={() => setIsNewChatVisible(false)} />
    </>
  );
}
