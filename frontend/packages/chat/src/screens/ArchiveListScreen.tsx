import { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HorizontalSeparator, Icon, SearchBar, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { buildHeaderStyle, buildScreenStyle, buildSearchContainerStyle } from "./empty-conversations-styles";
import { ConversationRow } from "../components/conversation-row";
import type { Conversation } from "../types";

function ArchiveHeader({ onBack, onEdit }: { readonly onBack: () => void; readonly onEdit: () => void }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildHeaderStyle(scale), [scale]);
  return (
    <View style={headerStyle}>
      <Pressable onPress={onBack} testID="back-button">
        <Icon name="back-arrow" size={24} color={theme.colors.primaryText} />
      </Pressable>
      <Text variant="subtitle2">{translate("chat:archiveTitle")}</Text>
      <Pressable onPress={onEdit} testID="edit-button">
        <Text variant="subtitle2" color={theme.colors.primaryAccent}>{translate("chat:editButton")}</Text>
      </Pressable>
    </View>
  );
}

interface ArchiveListScreenProps {
  readonly conversations: readonly Conversation[];
  readonly onBack: () => void;
  readonly onEdit: () => void;
}

export function ArchiveListScreen({ conversations, onBack, onEdit }: ArchiveListScreenProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const screenStyle = useMemo(
    () => [buildScreenStyle(theme.colors.secondaryBackground), { paddingTop: insets.top, paddingBottom: insets.bottom }],
    [theme.colors.secondaryBackground, insets.top, insets.bottom],
  );
  const listContentStyle = useMemo(() => ({ paddingHorizontal: scale(16) }), [scale]);
  const searchContainerStyle = useMemo(() => buildSearchContainerStyle(scale), [scale]);

  return (
    <View style={screenStyle}>
      <ArchiveHeader onBack={onBack} onEdit={onEdit} />
      <View style={searchContainerStyle}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} testID="archive-search" />
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={listContentStyle}
        ListHeaderComponent={HorizontalSeparator}
        ItemSeparatorComponent={HorizontalSeparator}
        renderItem={({ item }) => <ConversationRow conversation={item} />}
      />
    </View>
  );
}
