import { useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { MainScreen as MainScreenCore } from "@ion/main-tabs-ui";
import type { SheetActionHandlers } from "@ion/main-tabs-ui";
import { useAppNavigation, Routes } from "@ion/navigation";
import { Text } from "@ion/ui";

function FeedPlaceholder() {
  return <View style={styles.placeholder}><Text variant="subtitle">Feed</Text></View>;
}

function ChatPlaceholder() {
  return <View style={styles.placeholder}><Text variant="subtitle">Chat</Text></View>;
}

function WalletPlaceholder() {
  return <View style={styles.placeholder}><Text variant="subtitle">Wallet</Text></View>;
}

function ProfilePlaceholder() {
  return <View style={styles.placeholder}><Text variant="subtitle">Profile</Text></View>;
}

const SCREENS = {
  Feed: FeedPlaceholder,
  Chat: ChatPlaceholder,
  Wallet: WalletPlaceholder,
  Profile: ProfilePlaceholder,
};

export function MainScreen() {
  const navigation = useAppNavigation();

  const handleCreatePost = useCallback(() => {
    navigation.navigate(Routes.Sheet.CreatePost);
  }, [navigation]);

  const actionHandlers: SheetActionHandlers = useMemo(
    () => ({ onCreatePost: handleCreatePost }),
    [handleCreatePost],
  );

  return <MainScreenCore screens={SCREENS} actionHandlers={actionHandlers} />;
}

const styles = StyleSheet.create({
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
