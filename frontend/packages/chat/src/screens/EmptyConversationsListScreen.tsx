import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, SearchBar, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import {
  buildScreenStyle,
  buildHeaderStyle,
  buildHeaderTitleStyle,
  buildSearchContainerStyle,
  buildEmptyStateStyle,
  buildEmptyStateInnerStyle,
  buildEmptyStateImageStyle,
  buildCenteredTextStyle,
} from "./empty-conversations-styles";
import { chatEmptyStateImage } from "./chat-images";

function useScreenStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return {
    screen: useMemo(() => buildScreenStyle(theme.colors.secondaryBackground), [theme.colors.secondaryBackground]),
    header: useMemo(() => buildHeaderStyle(scale), [scale]),
    headerTitle: useMemo(() => buildHeaderTitleStyle(), []),
    searchContainer: useMemo(() => buildSearchContainerStyle(scale), [scale]),
    emptyState: useMemo(() => buildEmptyStateStyle(scale), [scale]),
    emptyStateInner: useMemo(() => buildEmptyStateInnerStyle(scale), [scale]),
    emptyStateImage: useMemo(() => buildEmptyStateImageStyle(scale), [scale]),
    centeredText: useMemo(() => buildCenteredTextStyle(), []),
  };
}

interface HeaderProps {
  readonly onEdit?: () => void;
  readonly onCompose?: () => void;
}

function ScreenHeader({ onEdit, onCompose }: HeaderProps) {
  const theme = useTheme();
  const styles = useScreenStyles();

  return (
    <View style={styles.header}>
      <Pressable onPress={onEdit} testID="edit-button">
        <Text variant="subtitle2" color={theme.colors.sheetLine}>{translate("chat:editButton")}</Text>
      </Pressable>
      <Text variant="subtitle2" style={styles.headerTitle}>{translate("chat:chatsTitle")}</Text>
      <Pressable onPress={onCompose} testID="compose-button">
        <Icon name="edit-link" size={24} color={theme.colors.primaryAccent} />
      </Pressable>
    </View>
  );
}

function EmptyState({ onNewMessage }: { readonly onNewMessage?: () => void }) {
  const theme = useTheme();
  const styles = useScreenStyles();

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateInner}>
        <Image source={chatEmptyStateImage} style={styles.emptyStateImage} />
        <Text variant="caption2" color={theme.colors.onTertiaryBackground} style={styles.centeredText}>
          {translate("chat:emptyStateMessage")}
        </Text>
      </View>
      <Pressable onPress={onNewMessage} testID="new-message-button">
        <Text variant="caption" color={theme.colors.primaryAccent} style={styles.centeredText}>
          {translate("chat:newMessageButton")}
        </Text>
      </Pressable>
    </View>
  );
}

export function EmptyConversationsListScreen() {
  const styles = useScreenStyles();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const handleCompose = useCallback(() => {}, []);
  const handleEdit = useCallback(() => {}, []);
  const handleNewMessage = useCallback(() => {}, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="empty-conversations-screen">
      <ScreenHeader onEdit={handleEdit} onCompose={handleCompose} />
      <View style={styles.searchContainer}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} testID="chat-search" />
      </View>
      <EmptyState onNewMessage={handleNewMessage} />
    </View>
  );
}
