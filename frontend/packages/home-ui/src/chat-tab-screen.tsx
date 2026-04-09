import { useCallback, useEffect, useState } from "react";
import {
  ConversationsListScreen, ConversationsEditScreen, NewChatSheet, DeleteChatSheet,
  ArchiveListScreen, ArchiveEditScreen, useChatState, useChatNavigation,
} from "@ion/chat";
import type { Conversation } from "@ion/chat";
import { useBottomNav } from "@ion/main-tabs-ui";

function useChatTabSetup() {
  const { setBottomNavHidden, setChatBadgeCount } = useBottomNav();
  const chat = useChatState();
  const nav = useChatNavigation(setBottomNavHidden);
  const [isNewChatVisible, setIsNewChatVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => setChatBadgeCount(chat.totalUnreadCount), [chat.totalUnreadCount, setChatBadgeCount]);
  useEffect(() => () => setBottomNavHidden(false), [setBottomNavHidden]);

  const handleConversationPress = useCallback((c: Conversation) => {
    if (c.isFolder) nav.showArchive();
  }, [nav]);

  const confirmDelete = useCallback(() => {
    if (pendingDeleteId) chat.deleteConversations(new Set([pendingDeleteId]));
    setPendingDeleteId(null);
  }, [chat, pendingDeleteId]);
  const cancelDelete = useCallback(() => setPendingDeleteId(null), []);

  const deleteConfirm = { isVisible: pendingDeleteId !== null, confirmDelete, cancelDelete };

  return { chat, nav, isNewChatVisible, setIsNewChatVisible, handleConversationPress, setPendingDeleteId, deleteConfirm };
}

export function ChatTabScreen() {
  const { chat, nav, isNewChatVisible, setIsNewChatVisible, handleConversationPress, setPendingDeleteId, deleteConfirm } = useChatTabSetup();

  if (nav.activeView === "edit") {
    return <ConversationsEditScreen conversations={chat.conversations} onDone={nav.showList} onArchive={chat.archiveConversations} onDelete={chat.deleteConversations} />;
  }
  if (nav.activeView === "archive-list") {
    return <ArchiveListScreen conversations={chat.archivedConversations} onBack={nav.showList} onEdit={nav.showArchiveEdit} />;
  }
  if (nav.activeView === "archive-edit") {
    return <ArchiveEditScreen conversations={chat.archivedConversations} onDone={nav.showArchiveList} onUnarchive={chat.unarchiveConversations} onDelete={chat.deleteArchivedConversations} />;
  }
  return (
    <>
      <ConversationsListScreen
        conversations={chat.conversations} archiveFolder={chat.archiveFolder}
        onEdit={nav.showEdit} onCompose={() => setIsNewChatVisible(true)}
        onConversationPress={handleConversationPress}
        onArchive={(c) => chat.archiveConversations(new Set([c.id]))}
        onDelete={(c) => setPendingDeleteId(c.id)}
      />
      <NewChatSheet isVisible={isNewChatVisible} onClose={() => setIsNewChatVisible(false)} />
      <DeleteChatSheet isVisible={deleteConfirm.isVisible} onClose={deleteConfirm.cancelDelete} onDelete={deleteConfirm.confirmDelete} />
    </>
  );
}
