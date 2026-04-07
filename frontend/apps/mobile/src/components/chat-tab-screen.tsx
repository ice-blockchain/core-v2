import { useCallback, useEffect, useState } from "react";
import { ConversationsListScreen, ConversationsEditScreen, NewChatSheet } from "@ion/chat";
import { useBottomNav } from "@ion/main-tabs-ui";

type ChatView = "list" | "edit";

export function ChatTabScreen() {
  const [activeView, setActiveView] = useState<ChatView>("list");
  const [isNewChatVisible, setIsNewChatVisible] = useState(false);
  const { setBottomNavHidden } = useBottomNav();

  useEffect(() => {
    return () => setBottomNavHidden(false);
  }, [setBottomNavHidden]);

  const handleEdit = useCallback(() => {
    setBottomNavHidden(true);
    setActiveView("edit");
  }, [setBottomNavHidden]);

  const handleDone = useCallback(() => {
    setBottomNavHidden(false);
    setActiveView("list");
  }, [setBottomNavHidden]);

  const handleCompose = useCallback(() => setIsNewChatVisible(true), []);
  const handleCloseSheet = useCallback(() => setIsNewChatVisible(false), []);

  if (activeView === "edit") {
    return <ConversationsEditScreen onDone={handleDone} />;
  }

  return (
    <>
      <ConversationsListScreen onEdit={handleEdit} onCompose={handleCompose} />
      <NewChatSheet isVisible={isNewChatVisible} onClose={handleCloseSheet} />
    </>
  );
}
