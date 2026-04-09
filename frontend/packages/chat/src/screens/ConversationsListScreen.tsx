import { useCallback, useMemo, useState } from "react";
import { FlatList, Platform, Pressable, View } from "react-native";
import type { LayoutChangeEvent, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HorizontalSeparator, Icon, SearchBar, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { buildHeaderStyle, buildScreenStyle, buildSearchContainerStyle } from "./empty-conversations-styles";

import { ConversationRow } from "../components/conversation-row";
import { ConversationContextMenu } from "../components/conversation-context-menu";
import { useConversationContextMenu } from "../components/use-conversation-context-menu";
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

interface ConversationActions {
  readonly onArchive?: (conversation: Conversation) => void;
  readonly onMute?: (conversation: Conversation) => void;
  readonly onBlock?: (conversation: Conversation) => void;
  readonly onDelete?: (conversation: Conversation) => void;
}

interface ConversationsListProps extends ConversationActions {
  readonly conversations?: readonly Conversation[];
  readonly archiveFolder?: Conversation | null;
  readonly onEdit?: () => void;
  readonly onCompose?: () => void;
  readonly onConversationPress?: (conversation: Conversation) => void;
}

interface ListSetupOptions {
  readonly archiveFolder: Conversation | null | undefined;
  readonly isArchiveVisible: boolean;
  readonly onConversationPress: ((c: Conversation) => void) | undefined;
  readonly contextMenu: ReturnType<typeof useConversationContextMenu>;
}

function useListSetup({ archiveFolder, isArchiveVisible, onConversationPress, contextMenu }: ListSetupOptions) {
  const renderItem = useCallback(({ item }: { readonly item: Conversation }) => (
    <Pressable
      ref={contextMenu.getRowRef(item.id)}
      onPress={() => onConversationPress?.(item)}
      onLongPress={() => { if (!item.isFolder) contextMenu.show(item); }}
    >
      <ConversationRow conversation={item} />
    </Pressable>
  ), [onConversationPress, contextMenu]);
  return {
    listHeader: useArchiveHeader(archiveFolder, isArchiveVisible, onConversationPress),
    renderItem,
  };
}

const NOOP = () => {};

function useScreenSetup(props: ConversationsListProps) {
  const { conversations, archiveFolder, onConversationPress } = props;
  const styles = useListScreenStyles();
  const [searchQuery, setSearchQuery] = useState("");
  const { isVisible, handleScroll } = useArchiveTileVisibility();
  const contextMenu = useConversationContextMenu();
  const { listHeader, renderItem } = useListSetup({ archiveFolder, isArchiveVisible: isVisible, onConversationPress, contextMenu });
  const data = conversations ?? MOCK_CONVERSATIONS;
  return { styles, searchQuery, setSearchQuery, handleScroll, contextMenu, listHeader, renderItem, data };
}

export function ConversationsListScreen(props: ConversationsListProps) {
  const { onEdit, onCompose, onArchive, onMute, onBlock, onDelete } = props;
  const setup = useScreenSetup(props);
  const { styles, contextMenu } = setup;
  return (
    <View style={styles.screen}>
      <ScreenHeader onEdit={onEdit ?? NOOP} onCompose={onCompose ?? NOOP} />
      <View style={styles.searchContainer}>
        <SearchBar value={setup.searchQuery} onChangeText={setup.setSearchQuery} testID="chat-search" />
      </View>
      <FlatList
        data={setup.data}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onLayout={styles.handleListLayout}
        ListHeaderComponent={setup.listHeader}
        ItemSeparatorComponent={HorizontalSeparator}
        onScroll={setup.handleScroll}
        scrollEventThrottle={16}
        renderItem={setup.renderItem}
      />
      <ConversationContextMenu
        state={contextMenu.state} onClose={contextMenu.close}
        onArchive={onArchive ?? NOOP} onMute={onMute ?? NOOP}
        onBlock={onBlock ?? NOOP} onDelete={onDelete ?? NOOP}
      />
    </View>
  );
}
