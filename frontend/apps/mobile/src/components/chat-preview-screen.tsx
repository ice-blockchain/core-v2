import { useCallback } from "react";
import { ChatPreviewScreen as ChatPreviewScreenCore } from "@ion/chat";
import { useAppNavigation } from "@ion/navigation";

export function ChatPreviewScreen() {
  const navigation = useAppNavigation();
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return <ChatPreviewScreenCore onBack={handleBack} />;
}
