import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { HorizontalSeparator, ListEditActionsBar, SearchBar, SelectableListItem, Text, useTheme } from "@ion/ui";
import type { ListEditAction } from "@ion/ui";
import { translate } from "@ion/localization";
import { buildHeaderStyle } from "./empty-conversations-styles";
import { useEditScreenStyles } from "./use-edit-screen-styles";
import { ConversationRow } from "../components/conversation-row";
import { MOCK_CONVERSATIONS } from "../components/mock-conversations";
import { ChatReadAllIcon } from "../icons/ChatReadAllIcon";
import { ChatArchiveIcon } from "../icons/ChatArchiveIcon";
import { TrashIcon } from "../icons/TrashIcon";
import { DeleteChatSheet } from "./DeleteChatSheet";
import { useEditState } from "../use-edit-state";
import type { Conversation } from "../types";

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

function useEditActions(handlers: { readonly onRead?: () => void; readonly onArchive: () => void; readonly onDelete: () => void; readonly useAll: boolean }): readonly ListEditAction[] {
  const theme = useTheme();
  const iconSize = theme.scale.scaleSize(20);
  const readLabel = handlers.useAll ? translate("chat:readAllActionAll") : translate("chat:readAllAction");
  const archiveLabel = handlers.useAll ? translate("chat:archiveActionAll") : translate("chat:archiveAction");
  const deleteLabel = handlers.useAll ? translate("chat:deleteActionAll") : translate("chat:deleteAction");
  return useMemo(() => [
    { icon: (color: string) => <ChatReadAllIcon size={iconSize} color={color} />, label: readLabel, onPress: handlers.onRead ?? (() => {}) },
    { icon: (color: string) => <ChatArchiveIcon size={iconSize} color={color} />, label: archiveLabel, onPress: handlers.onArchive },
    { icon: (color: string) => <TrashIcon size={iconSize} color={color} />, label: deleteLabel, onPress: handlers.onDelete, color: theme.colors.attentionRed },
  ], [theme.colors.attentionRed, iconSize, readLabel, archiveLabel, deleteLabel, handlers.onRead, handlers.onArchive, handlers.onDelete]);
}

type EditableListProps = {
  readonly data: readonly Conversation[];
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggle: (id: string) => void;
  readonly contentStyle: object;
};

function EditableConversationsList({ data, selectedIds, onToggle, contentStyle }: EditableListProps) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={contentStyle}
      ListHeaderComponent={HorizontalSeparator}
      ItemSeparatorComponent={HorizontalSeparator}
      renderItem={({ item }) =>
        item.isFolder ? (
          <ConversationRow conversation={item} />
        ) : (
          <SelectableListItem isSelected={selectedIds.has(item.id)} onToggle={() => onToggle(item.id)}>
            <ConversationRow conversation={item} />
          </SelectableListItem>
        )
      }
    />
  );
}

interface ConversationsEditScreenProps {
  readonly conversations?: readonly Conversation[];
  readonly onDone?: () => void;
  readonly onRead?: (ids: ReadonlySet<string>) => void;
  readonly onArchive?: (ids: ReadonlySet<string>) => void;
  readonly onDelete?: (ids: ReadonlySet<string>) => void;
}

export function ConversationsEditScreen({ conversations, onDone, onRead, onArchive, onDelete }: ConversationsEditScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const data = conversations ?? MOCK_CONVERSATIONS;
  const { selectedIds, toggleItem, deleteSheet } = useEditState();
  const styles = useEditScreenStyles();
  const allIds = useMemo(() => new Set(data.filter((c) => !c.isFolder).map((c) => c.id)), [data]);
  const targetIds = selectedIds.size === 0 ? allIds : selectedIds;
  const useAll = selectedIds.size === 0;
  const handleRead = useCallback(() => { onRead?.(targetIds); }, [onRead, targetIds]);
  const handleArchive = useCallback(() => { onArchive?.(targetIds); onDone?.(); }, [onArchive, targetIds, onDone]);
  const handleDeleteConfirm = useCallback(() => { onDelete?.(targetIds); deleteSheet.confirm(); onDone?.(); }, [onDelete, targetIds, deleteSheet, onDone]);
  const actions = useEditActions({ onRead: handleRead, onArchive: handleArchive, onDelete: deleteSheet.show, useAll });

  return (
    <>
      <View style={styles.screen}>
        <ScreenHeader onDone={onDone ?? (() => {})} />
        <View style={styles.searchContainer}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} testID="edit-search" />
        </View>
        <EditableConversationsList data={data} selectedIds={selectedIds} onToggle={toggleItem} contentStyle={styles.content} />
        <ListEditActionsBar actions={actions} style={styles.bottomPadding} />
      </View>
      <DeleteChatSheet isVisible={deleteSheet.isVisible} onClose={deleteSheet.close} onDelete={handleDeleteConfirm} />
    </>
  );
}
