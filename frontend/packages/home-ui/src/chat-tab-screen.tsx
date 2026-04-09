import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConversationsListScreen, ConversationsEditScreen, NewChatSheet, DeleteChatSheet,
  ArchiveListScreen, ArchiveEditScreen, EmptyConversationsListScreen, LoadingConversationsListScreen,
  ConversationScreen, useChatState, useChatNavigation,
} from "@ion/chat";
import type { Conversation, SearchableUser } from "@ion/chat";
import { useBottomNav } from "@ion/main-tabs-ui";

const LOADING_DURATION_MS = 1000;

interface ActiveContact {
  readonly name: string;
  readonly username: string | undefined;
  readonly avatarUrl: string | undefined;
  readonly isVerified: boolean | undefined;
}

function useLoadingState() {
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setIsLoading(false), LOADING_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return isLoading;
}

function contactFromConversation(conversation: Conversation): ActiveContact {
  return { name: conversation.name, username: conversation.username, avatarUrl: conversation.avatarUrl, isVerified: conversation.isVerified };
}

function contactFromSearchUser(user: SearchableUser): ActiveContact {
  return { name: user.displayName, username: user.username, avatarUrl: user.avatarUrl, isVerified: user.isVerified };
}

function useDeleteConfirmation(chat: ReturnType<typeof useChatState>) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirmDelete = useCallback(() => {
    if (pendingDeleteId) chat.deleteConversations(new Set([pendingDeleteId]));
    setPendingDeleteId(null);
  }, [chat, pendingDeleteId]);
  const cancelDelete = useCallback(() => setPendingDeleteId(null), []);

  return { isVisible: pendingDeleteId !== null, confirmDelete, cancelDelete, setPendingDeleteId };
}

function useConversationNavigation(nav: ReturnType<typeof useChatNavigation>) {
  const [activeContact, setActiveContact] = useState<ActiveContact | null>(null);
  const [isNewChatVisible, setIsNewChatVisible] = useState(false);

  const handleConversationPress = useCallback((c: Conversation) => {
    if (c.isFolder) { nav.showArchive(); return; }
    setActiveContact(contactFromConversation(c));
    nav.showConversation();
  }, [nav]);

  const handleSelectUser = useCallback((user: SearchableUser) => {
    setIsNewChatVisible(false);
    setActiveContact(contactFromSearchUser(user));
    nav.showConversation();
  }, [nav]);

  const handleConversationBack = useCallback(() => { setActiveContact(null); nav.showList(); }, [nav]);

  return { activeContact, isNewChatVisible, setIsNewChatVisible, handleConversationPress, handleSelectUser, handleConversationBack };
}

function useChatTabSetup() {
  const { setBottomNavHidden, setChatBadgeCount } = useBottomNav();
  const chat = useChatState();
  const nav = useChatNavigation(setBottomNavHidden);
  const isLoading = useLoadingState();
  const deleteConfirm = useDeleteConfirmation(chat);
  const convNav = useConversationNavigation(nav);

  useEffect(() => setChatBadgeCount(chat.totalUnreadCount), [chat.totalUnreadCount, setChatBadgeCount]);
  useEffect(() => () => setBottomNavHidden(false), [setBottomNavHidden]);

  return { chat, nav, isLoading, deleteConfirm, ...convNav };
}

function ChatListView({ setup }: { readonly setup: ReturnType<typeof useChatTabSetup> }) {
  const { chat, isNewChatVisible, setIsNewChatVisible, handleConversationPress, handleSelectUser, deleteConfirm, nav } = setup;
  const hasConversations = chat.conversations.length > 0;
  const handleCompose = useCallback(() => setIsNewChatVisible(true), [setIsNewChatVisible]);
  const handleCloseSheet = useCallback(() => setIsNewChatVisible(false), [setIsNewChatVisible]);

  if (!hasConversations) {
    return (
      <>
        <EmptyConversationsListScreen onCompose={handleCompose} />
        <NewChatSheet isVisible={isNewChatVisible} onClose={handleCloseSheet} onSelectUser={handleSelectUser} />
      </>
    );
  }

  return (
    <>
      <ConversationsListScreen
        conversations={chat.conversations} archiveFolder={chat.archiveFolder}
        onEdit={nav.showEdit} onCompose={handleCompose}
        onConversationPress={handleConversationPress}
        onArchive={(c) => chat.archiveConversations(new Set([c.id]))}
        onDelete={(c) => deleteConfirm.setPendingDeleteId(c.id)}
      />
      <NewChatSheet isVisible={isNewChatVisible} onClose={handleCloseSheet} onSelectUser={handleSelectUser} />
      <DeleteChatSheet isVisible={deleteConfirm.isVisible} onClose={deleteConfirm.cancelDelete} onDelete={deleteConfirm.confirmDelete} />
    </>
  );
}

export function ChatTabScreen() {
  const setup = useChatTabSetup();
  const { nav, chat, isLoading, activeContact, handleConversationBack } = setup;

  if (isLoading) return <LoadingConversationsListScreen />;
  if (nav.activeView === "conversation" && activeContact) {
    return <ConversationScreen name={activeContact.name} username={activeContact.username} avatarUrl={activeContact.avatarUrl} isVerified={activeContact.isVerified} onBack={handleConversationBack} />;
  }
  if (nav.activeView === "edit") {
    return <ConversationsEditScreen conversations={chat.conversations} onDone={nav.showList} onArchive={chat.archiveConversations} onDelete={chat.deleteConversations} />;
  }
  if (nav.activeView === "archive-list") {
    return <ArchiveListScreen conversations={chat.archivedConversations} onBack={nav.showList} onEdit={nav.showArchiveEdit} />;
  }
  if (nav.activeView === "archive-edit") {
    return <ArchiveEditScreen conversations={chat.archivedConversations} onDone={nav.showArchiveList} onUnarchive={chat.unarchiveConversations} onDelete={chat.deleteArchivedConversations} />;
  }
  return <ChatListView setup={setup} />;
}
