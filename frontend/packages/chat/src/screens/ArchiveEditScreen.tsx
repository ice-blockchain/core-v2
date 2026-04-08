import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { HorizontalSeparator, ListEditActionsBar, SearchBar, SelectableListItem, Text, useTheme } from "@ion/ui";
import type { ListEditAction } from "@ion/ui";
import { translate } from "@ion/localization";
import { buildHeaderStyle } from "./empty-conversations-styles";
import { useEditScreenStyles } from "./use-edit-screen-styles";
import { ConversationRow } from "../components/conversation-row";
import { ChatReadAllIcon } from "../icons/ChatReadAllIcon";
import { ChatUnarchiveIcon } from "../icons/ChatUnarchiveIcon";
import { TrashIcon } from "../icons/TrashIcon";
import { DeleteChatSheet } from "./DeleteChatSheet";
import { useEditState } from "../use-edit-state";
import type { Conversation } from "../types";

function ArchiveEditHeader({ onDone }: { readonly onDone: () => void }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildHeaderStyle(scale), [scale]);
  return (
    <View style={headerStyle}>
      <Pressable onPress={onDone} testID="done-button">
        <Text variant="subtitle2" color={theme.colors.primaryAccent}>{translate("chat:doneButton")}</Text>
      </Pressable>
      <Text variant="subtitle2">{translate("chat:archiveTitle")}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function useArchiveActions(handlers: { readonly onUnarchive: () => void; readonly onDelete: () => void; readonly useAll: boolean }): readonly ListEditAction[] {
  const theme = useTheme();
  const iconSize = theme.scale.scaleSize(20);
  const readLabel = handlers.useAll ? translate("chat:readAllActionAll") : translate("chat:readAllAction");
  const unarchiveLabel = handlers.useAll ? translate("chat:unarchiveActionAll") : translate("chat:unarchiveAction");
  const deleteLabel = handlers.useAll ? translate("chat:deleteActionAll") : translate("chat:deleteAction");
  return useMemo(() => [
    { icon: (color: string) => <ChatReadAllIcon size={iconSize} color={color} />, label: readLabel, onPress: () => {} },
    { icon: (color: string) => <ChatUnarchiveIcon size={iconSize} color={color} />, label: unarchiveLabel, onPress: handlers.onUnarchive },
    { icon: (color: string) => <TrashIcon size={iconSize} color={color} />, label: deleteLabel, onPress: handlers.onDelete, color: theme.colors.attentionRed },
  ], [theme.colors.attentionRed, iconSize, readLabel, unarchiveLabel, deleteLabel, handlers.onUnarchive, handlers.onDelete]);
}

type ArchiveListProps = {
  readonly data: readonly Conversation[];
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggle: (id: string) => void;
  readonly contentStyle: object;
};

function ArchiveSelectableList({ data, selectedIds, onToggle, contentStyle }: ArchiveListProps) {
  return (
    <FlatList
      data={data}
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

interface ArchiveEditScreenProps {
  readonly conversations: readonly Conversation[];
  readonly onDone: () => void;
  readonly onUnarchive?: (ids: ReadonlySet<string>) => void;
  readonly onDelete?: (ids: ReadonlySet<string>) => void;
}

export function ArchiveEditScreen({ conversations, onDone, onUnarchive, onDelete }: ArchiveEditScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedIds, toggleItem, deleteSheet } = useEditState();
  const styles = useEditScreenStyles();
  const allIds = useMemo(() => new Set(conversations.map((c) => c.id)), [conversations]);
  const targetIds = selectedIds.size === 0 ? allIds : selectedIds;
  const useAll = selectedIds.size !== 1;
  const handleUnarchive = useCallback(() => { onUnarchive?.(targetIds); onDone(); }, [onUnarchive, targetIds, onDone]);
  const handleDeleteConfirm = useCallback(() => { onDelete?.(targetIds); deleteSheet.confirm(); onDone(); }, [onDelete, targetIds, deleteSheet, onDone]);
  const actions = useArchiveActions({ onUnarchive: handleUnarchive, onDelete: deleteSheet.show, useAll });

  return (
    <>
      <View style={styles.screen}>
        <ArchiveEditHeader onDone={onDone} />
        <View style={styles.searchContainer}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} testID="archive-edit-search" />
        </View>
        <ArchiveSelectableList data={conversations} selectedIds={selectedIds} onToggle={toggleItem} contentStyle={styles.content} />
        <ListEditActionsBar actions={actions} style={styles.bottomPadding} />
      </View>
      <DeleteChatSheet isVisible={deleteSheet.isVisible} onClose={deleteSheet.close} onDelete={handleDeleteConfirm} />
    </>
  );
}
