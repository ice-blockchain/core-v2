import { useCallback } from "react";
import { CatalogScreen as CatalogScreenCore } from "@ion/ui";
import { Button } from "@ion/ui";
import { useAppNavigation, Routes } from "@ion/navigation";

function ChatScreensButton() {
  const navigation = useAppNavigation();
  const handlePress = useCallback(() => navigation.navigate(Routes.ChatPreview), [navigation]);

  return <Button height={44} color="secondary" label="Chat Screens" onPress={handlePress} />;
}

export function CatalogScreen() {
  return <CatalogScreenCore headerSlot={<ChatScreensButton />} />;
}
