import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Conversation } from "./types";
import { MOCK_CONVERSATIONS, MOCK_ARCHIVED_CONVERSATIONS } from "./components/mock-conversations";

type ConversationSetter = Dispatch<SetStateAction<readonly Conversation[]>>;

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

function useConversationMutations(setConversations: ConversationSetter, setArchived: ConversationSetter) {
  const archiveConversations = useCallback((ids: ReadonlySet<string>) => {
    setConversations((prev) => {
      const toArchive = prev.filter((c) => ids.has(c.id));
      setArchived((archived) => [...toArchive, ...archived]);
      return prev.filter((c) => !ids.has(c.id));
    });
  }, [setConversations, setArchived]);

  const unarchiveConversations = useCallback((ids: ReadonlySet<string>) => {
    setArchived((prev) => {
      const toRestore = prev.filter((c) => ids.has(c.id));
      setConversations((convs) => [...toRestore, ...convs]);
      return prev.filter((c) => !ids.has(c.id));
    });
  }, [setConversations, setArchived]);

  const deleteConversations = useCallback(
    (ids: ReadonlySet<string>) => setConversations((prev) => prev.filter((c) => !ids.has(c.id))),
    [setConversations],
  );
  const deleteArchivedConversations = useCallback(
    (ids: ReadonlySet<string>) => setArchived((prev) => prev.filter((c) => !ids.has(c.id))),
    [setArchived],
  );

  return { archiveConversations, unarchiveConversations, deleteConversations, deleteArchivedConversations };
}

export function useChatState() {
  const [conversations, setConversations] = useState<readonly Conversation[]>(initialConversations);
  const [archivedConversations, setArchivedConversations] = useState<readonly Conversation[]>(MOCK_ARCHIVED_CONVERSATIONS);
  const archiveFolder = useMemo(() => buildArchiveFolder(archivedConversations), [archivedConversations]);
  const displayConversations = useMemo(() => [archiveFolder, ...conversations], [archiveFolder, conversations]);
  const totalUnreadCount = useMemo(() => computeTotalUnread(conversations, archivedConversations), [conversations, archivedConversations]);
  const mutations = useConversationMutations(setConversations, setArchivedConversations);
  return { displayConversations, conversations, archiveFolder, archivedConversations, totalUnreadCount, ...mutations };
}
