import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { EmptyConversationsListScreen } from "./EmptyConversationsListScreen";

type PreviewScreen = "menu" | "empty-conversations";

const SCREEN_OPTIONS: Array<{ key: PreviewScreen; label: string }> = [
  { key: "empty-conversations", label: "Empty Conversations List" },
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

export function ChatPreviewScreen({ onBack }: { readonly onBack: () => void }) {
  const [activeScreen, setActiveScreen] = useState<PreviewScreen>("menu");
  const goToMenu = useCallback(() => setActiveScreen("menu"), []);

  if (activeScreen === "empty-conversations") {
    return <EmptyConversationsListScreen />;
  }

  return <ScreenMenu onSelect={setActiveScreen} onBack={onBack} />;
}
