import { useCallback } from "react";
import { ChatPreviewScreen as ChatPreviewScreenCore } from "@ion/chat";
import { useAppNavigation, Routes } from "@ion/navigation";

export function ChatPreviewScreen() {
  const navigation = useAppNavigation();
  const handleBack = useCallback(() => navigation.navigate(Routes.Catalog), [navigation]);

  return <ChatPreviewScreenCore onBack={handleBack} />;
}
