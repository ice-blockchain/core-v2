import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HorizontalSeparator, ListEditActionsBar, SearchBar, SelectableListItem, Text, useTheme } from "@ion/ui";
import type { ListEditAction } from "@ion/ui";
import { translate } from "@ion/localization";
import { buildHeaderStyle, buildScreenStyle, buildSearchContainerStyle } from "./empty-conversations-styles";
import { ConversationRow, MOCK_CONVERSATIONS } from "../components/conversation-row";
import { ChatReadAllIcon } from "../icons/ChatReadAllIcon";
import { ChatArchiveIcon } from "../icons/ChatArchiveIcon";
import { TrashIcon } from "../icons/TrashIcon";
import { DeleteChatSheet } from "./DeleteChatSheet";

function ScreenHeader({ onDone }: { readonly onDone: () => void }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildHeaderStyle(scale), [scale]);
  return (
    <View style={headerStyle}>
      <Pressable onPress={onDone} testID="done-button">
        <Text variant="subtitle2" color={theme.colors.primaryAccent}>{translate("chat:doneButton")}</Text>
      </Pressable>
      <Text variant="subtitle2">{translate("chat:chatsTitle")}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

type SelectableListProps = {
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggle: (id: string) => void;
};

function SelectableConversationsList({ selectedIds, onToggle }: SelectableListProps) {
  const scale = useTheme().scale.scaleSize;
  const contentStyle = useMemo(() => ({ paddingHorizontal: scale(16) }), [scale]);
  return (
    <FlatList
      data={MOCK_CONVERSATIONS}
      keyExtractor={(item) => item.id}
      contentContainerStyle={contentStyle}
      ListHeaderComponent={HorizontalSeparator}
      ItemSeparatorComponent={HorizontalSeparator}
      renderItem={({ item }) => (
        <SelectableListItem isSelected={selectedIds.has(item.id)} onToggle={() => onToggle(item.id)}>
          <ConversationRow conversation={item} />
        </SelectableListItem>
      )}
    />
  );
}

function useEditState() {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const deleteSheet = {
    isVisible: isDeleteVisible,
    show: useCallback(() => setIsDeleteVisible(true), []),
    close: useCallback(() => setIsDeleteVisible(false), []),
    confirm: useCallback(() => { setIsDeleteVisible(false); setSelectedIds(new Set()); }, []),
  };

  return { selectedIds, toggleItem, deleteSheet };
}

function useEditActions(onDelete: () => void): readonly ListEditAction[] {
  const theme = useTheme();
  const iconSize = theme.scale.scaleSize(20);
  return useMemo(() => [
    { icon: (color) => <ChatReadAllIcon size={iconSize} color={color} />, label: translate("chat:readAllAction"), onPress: () => {} },
    { icon: (color) => <ChatArchiveIcon size={iconSize} color={color} />, label: translate("chat:archiveAction"), onPress: () => {} },
    { icon: (color) => <TrashIcon size={iconSize} color={color} />, label: translate("chat:deleteAction"), onPress: onDelete, color: theme.colors.attentionRed },
  ], [theme.colors.attentionRed, iconSize, onDelete]);
}

export function ConversationsEditScreen({ onDone }: { readonly onDone?: () => void }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedIds, toggleItem, deleteSheet } = useEditState();
  const actions = useEditActions(deleteSheet.show);

  const screenStyle = useMemo(
    () => [buildScreenStyle(theme.colors.secondaryBackground), { paddingTop: insets.top }],
    [theme.colors.secondaryBackground, insets.top],
  );

  return (
    <>
      <View style={screenStyle}>
        <ScreenHeader onDone={onDone ?? (() => {})} />
        <View style={buildSearchContainerStyle(scale)}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} testID="edit-search" />
        </View>
        <SelectableConversationsList selectedIds={selectedIds} onToggle={toggleItem} />
        <ListEditActionsBar actions={actions} style={{ paddingBottom: insets.bottom }} />
      </View>
      <DeleteChatSheet isVisible={deleteSheet.isVisible} onClose={deleteSheet.close} onDelete={deleteSheet.confirm} />
    </>
  );
}
