import { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HorizontalSeparator, Icon, SearchBar, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { buildHeaderStyle, buildScreenStyle, buildSearchContainerStyle } from "./empty-conversations-styles";
import { ConversationRow, MOCK_CONVERSATIONS } from "../components/conversation-row";

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

interface ConversationsListProps {
  readonly onEdit?: () => void;
  readonly onCompose?: () => void;
}

export function ConversationsListScreen({ onEdit, onCompose }: ConversationsListProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const screenStyle = useMemo(
    () => [buildScreenStyle(theme.colors.secondaryBackground), { paddingTop: insets.top, paddingBottom: insets.bottom }],
    [theme.colors.secondaryBackground, insets.top, insets.bottom],
  );
  const listContentStyle = useMemo(() => ({ paddingHorizontal: scale(16) }), [scale]);

  return (
    <View style={screenStyle}>
      <ScreenHeader onEdit={onEdit ?? (() => {})} onCompose={onCompose ?? (() => {})} />
      <View style={buildSearchContainerStyle(scale)}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} testID="chat-search" />
      </View>
      <FlatList
        data={MOCK_CONVERSATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={listContentStyle}
        ListHeaderComponent={HorizontalSeparator}
        ItemSeparatorComponent={HorizontalSeparator}
        renderItem={({ item }) => <ConversationRow conversation={item} />}
      />
    </View>
  );
}
