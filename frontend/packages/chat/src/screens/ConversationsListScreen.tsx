import { useCallback, useMemo, useState } from "react";
import { FlatList, Platform, Pressable, View } from "react-native";
import type { LayoutChangeEvent, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HorizontalSeparator, Icon, SearchBar, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { buildHeaderStyle, buildScreenStyle, buildSearchContainerStyle } from "./empty-conversations-styles";

import { ConversationRow } from "../components/conversation-row";
import { MOCK_CONVERSATIONS } from "../components/mock-conversations";
import { ArchiveTileHeader } from "./archive-tile-header";
import { useArchiveTileVisibility } from "./use-archive-pull-reveal";
import type { Conversation } from "../types";

const FLEX_ONE: ViewStyle = { flex: 1 };
const isWeb = Platform.OS === "web";

interface ScreenHeaderProps {
  readonly onEdit: () => void;
  readonly onCompose: () => void;
}

function ScreenHeader({ onEdit, onCompose }: ScreenHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildHeaderStyle(scale), [scale]);
  return (
    <View style={headerStyle}>
      <Pressable onPress={onEdit} testID="edit-button">
        <Text variant="subtitle2" color={theme.colors.primaryAccent}>{translate("chat:editButton")}</Text>
      </Pressable>
      <Text variant="subtitle2">{translate("chat:chatsTitle")}</Text>
      <Pressable onPress={onCompose} testID="compose-button">
        <Icon name="edit-link" size={24} color={theme.colors.primaryAccent} />
      </Pressable>
    </View>
  );
}

function useListScreenStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();
  const [listHeight, setListHeight] = useState(0);
  const handleListLayout = useCallback((e: LayoutChangeEvent) => setListHeight(e.nativeEvent.layout.height), []);
  const webMinHeight = isWeb && listHeight > 0 ? listHeight + scale(64) : undefined;
  return {
    screen: useMemo(() => [buildScreenStyle(theme.colors.secondaryBackground), { paddingTop: insets.top, paddingBottom: insets.bottom }], [theme.colors.secondaryBackground, insets.top, insets.bottom]),
    list: FLEX_ONE,
    listContent: useMemo(() => ({ paddingHorizontal: scale(16), flexGrow: 1, paddingBottom: scale(64), minHeight: webMinHeight }), [scale, webMinHeight]),
    searchContainer: useMemo(() => buildSearchContainerStyle(scale), [scale]),
    handleListLayout,
  };
}

function useArchiveHeader(archiveFolder: Conversation | null | undefined, isVisible: boolean, onPress?: (c: Conversation) => void) {
  return useCallback(() => {
    if (!archiveFolder) return <HorizontalSeparator />;
    if (!isVisible) return null;
    return <ArchiveTileHeader conversation={archiveFolder} onPress={() => onPress?.(archiveFolder)} />;
  }, [archiveFolder, isVisible, onPress]);
}

interface ConversationsListProps {
  readonly conversations?: readonly Conversation[];
  readonly archiveFolder?: Conversation | null;
  readonly onEdit?: () => void;
  readonly onCompose?: () => void;
  readonly onConversationPress?: (conversation: Conversation) => void;
}

function useListSetup(archiveFolder: Conversation | null | undefined, isArchiveVisible: boolean, onConversationPress?: (c: Conversation) => void) {
  const renderItem = useCallback(({ item }: { readonly item: Conversation }) => (
    <Pressable onPress={() => onConversationPress?.(item)}>
      <ConversationRow conversation={item} />
    </Pressable>
  ), [onConversationPress]);
  return {
    listHeader: useArchiveHeader(archiveFolder, isArchiveVisible, onConversationPress),
    renderItem,
  };
}

export function ConversationsListScreen({ conversations, archiveFolder, onEdit, onCompose, onConversationPress }: ConversationsListProps) {
  const { handleListLayout, ...styles } = useListScreenStyles();
  const [searchQuery, setSearchQuery] = useState("");
  const { isVisible, handleScroll } = useArchiveTileVisibility();
  const { listHeader, renderItem } = useListSetup(archiveFolder, isVisible, onConversationPress);
  return (
    <View style={styles.screen}>
      <ScreenHeader onEdit={onEdit ?? (() => {})} onCompose={onCompose ?? (() => {})} />
      <View style={styles.searchContainer}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} testID="chat-search" />
      </View>
      <FlatList
        data={conversations ?? MOCK_CONVERSATIONS}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onLayout={handleListLayout}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={HorizontalSeparator}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={renderItem}
      />
    </View>
  );
}
