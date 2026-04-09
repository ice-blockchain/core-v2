import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Conversation } from "./types";
import { MOCK_CONVERSATIONS, MOCK_ARCHIVED_CONVERSATIONS } from "./components/mock-conversations";

interface ConversationState {
  readonly conversations: readonly Conversation[];
  readonly archived: readonly Conversation[];
}

function buildArchiveFolder(archived: readonly Conversation[]): Conversation {
  const names = archived.slice(0, 2).map((c) => c.name).join(", ");
  const preview = archived.length > 2 ? `${names}...` : names;
  const unreadCount = archived.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
  return { id: "archive-folder", name: "Archive", preview, time: archived[0]?.time ?? "", unreadCount, isFolder: true };
}

function computeTotalUnread(conversations: readonly Conversation[], archived: readonly Conversation[]): number {
  return [...conversations, ...archived].reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
}

function initialConversations(): readonly Conversation[] {
  return MOCK_CONVERSATIONS.filter((c) => !c.isFolder);
}

function useConversationMutations(setState: Dispatch<SetStateAction<ConversationState>>) {
  const archiveConversations = useCallback((ids: ReadonlySet<string>) => {
    setState((prev) => {
      const toArchive = prev.conversations.filter((c) => ids.has(c.id));
      return { conversations: prev.conversations.filter((c) => !ids.has(c.id)), archived: [...toArchive, ...prev.archived] };
    });
  }, [setState]);

  const unarchiveConversations = useCallback((ids: ReadonlySet<string>) => {
    setState((prev) => {
      const toRestore = prev.archived.filter((c) => ids.has(c.id));
      return { conversations: [...toRestore, ...prev.conversations], archived: prev.archived.filter((c) => !ids.has(c.id)) };
    });
  }, [setState]);

  const deleteConversations = useCallback(
    (ids: ReadonlySet<string>) => setState((prev) => ({ ...prev, conversations: prev.conversations.filter((c) => !ids.has(c.id)) })),
    [setState],
  );
  const deleteArchivedConversations = useCallback(
    (ids: ReadonlySet<string>) => setState((prev) => ({ ...prev, archived: prev.archived.filter((c) => !ids.has(c.id)) })),
    [setState],
  );

  return { archiveConversations, unarchiveConversations, deleteConversations, deleteArchivedConversations };
}

export function useChatState() {
  const [state, setState] = useState<ConversationState>({ conversations: initialConversations(), archived: MOCK_ARCHIVED_CONVERSATIONS });
  const { conversations, archived: archivedConversations } = state;
  const archiveFolder = useMemo(() => buildArchiveFolder(archivedConversations), [archivedConversations]);
  const displayConversations = useMemo(() => [archiveFolder, ...conversations], [archiveFolder, conversations]);
  const totalUnreadCount = useMemo(() => computeTotalUnread(conversations, archivedConversations), [conversations, archivedConversations]);
  const mutations = useConversationMutations(setState);
  return { displayConversations, conversations, archiveFolder, archivedConversations, totalUnreadCount, ...mutations };
}
