import { useCallback } from "react";
import { View } from "react-native";
import { CatalogScreen as CatalogScreenCore } from "@ion/ui";
import { Button } from "@ion/ui";
import { useAppNavigation, Routes } from "@ion/navigation";

function HeaderButtons() {
  const navigation = useAppNavigation();
  const handleChat = useCallback(() => navigation.navigate(Routes.ChatPreview), [navigation]);
  const handleMain = useCallback(() => navigation.navigate(Routes.Main), [navigation]);

  return (
    <View style={{ gap: 8 }}>
      <Button height={44} color="secondary" label="Chat Screens" onPress={handleChat} />
      <Button height={44} color="primary" label="Main Screen" onPress={handleMain} />
    </View>
  );
}

export function CatalogScreen() {
  return <CatalogScreenCore headerSlot={<HeaderButtons />} />;
}
