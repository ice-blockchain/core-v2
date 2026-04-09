import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { EmptyConversationsListScreen } from "./EmptyConversationsListScreen";
import { LoadingConversationsListScreen } from "./LoadingConversationsListScreen";
import { ConversationsListScreen } from "./ConversationsListScreen";
import { ConversationsEditScreen } from "./ConversationsEditScreen";
import { NewChatSheet } from "./NewChatSheet";

type PreviewScreen = "menu" | "empty-conversations" | "loading-conversations" | "conversations-list" | "conversations-edit";

const SCREEN_OPTIONS: Array<{ key: PreviewScreen; label: string }> = [
  { key: "empty-conversations", label: "Empty Conversations List" },
  { key: "loading-conversations", label: "Loading Conversations List" },
  { key: "conversations-list", label: "Conversations List" },
];

function useMenuStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return {
    container: useMemo(() => ({
      flex: 1,
      backgroundColor: theme.colors.secondaryBackground,
      paddingTop: scale(60),
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.md,
    }), [theme, scale]),
    button: useMemo(() => ({
      backgroundColor: theme.colors.primaryBackground,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.medium,
    }), [theme]),
    backButton: useMemo(() => ({
      paddingVertical: theme.spacing.sm,
    }), [theme]),
  };
}

function ScreenMenu({ onSelect, onBack }: {
  readonly onSelect: (screen: PreviewScreen) => void;
  readonly onBack: () => void;
}) {
  const theme = useTheme();
  const styles = useMenuStyles();

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text variant="subtitle2" color={theme.colors.primaryAccent}>Back</Text>
      </Pressable>
      <Text variant="headline2">Chat Screens</Text>
      {SCREEN_OPTIONS.map(({ key, label }) => (
        <Pressable key={key} onPress={() => onSelect(key)} style={styles.button}>
          <Text variant="subtitle">{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

type ActiveScreenProps = {
  readonly activeScreen: PreviewScreen;
  readonly isNewChatVisible: boolean;
  readonly onCompose: () => void;
  readonly onCloseSheet: () => void;
  readonly onSetScreen: (screen: PreviewScreen) => void;
  readonly onBack: () => void;
};

function ActiveScreenContent({ activeScreen, isNewChatVisible, onCompose, onCloseSheet, onSetScreen, onBack }: ActiveScreenProps) {
  if (activeScreen === "empty-conversations") {
    return (
      <>
        <EmptyConversationsListScreen onCompose={onCompose} />
        <NewChatSheet isVisible={isNewChatVisible} onClose={onCloseSheet} onSelectUser={undefined} />
      </>
    );
  }

  if (activeScreen === "loading-conversations") {
    return <LoadingConversationsListScreen />;
  }

  if (activeScreen === "conversations-list") {
    return (
      <>
        <ConversationsListScreen onEdit={() => onSetScreen("conversations-edit")} onCompose={onCompose} />
        <NewChatSheet isVisible={isNewChatVisible} onClose={onCloseSheet} onSelectUser={undefined} />
      </>
    );
  }

  if (activeScreen === "conversations-edit") {
    return <ConversationsEditScreen onDone={() => onSetScreen("conversations-list")} />;
  }

  return <ScreenMenu onSelect={onSetScreen} onBack={onBack} />;
}

export function ChatPreviewScreen({ onBack }: { readonly onBack: () => void }) {
  const [activeScreen, setActiveScreen] = useState<PreviewScreen>("menu");
  const [isNewChatVisible, setIsNewChatVisible] = useState(false);

  const handleCompose = useCallback(() => setIsNewChatVisible(true), []);
  const handleCloseSheet = useCallback(() => setIsNewChatVisible(false), []);

  return (
    <ActiveScreenContent
      activeScreen={activeScreen}
      isNewChatVisible={isNewChatVisible}
      onCompose={handleCompose}
      onCloseSheet={handleCloseSheet}
      onSetScreen={setActiveScreen}
      onBack={onBack}
    />
  );
}
