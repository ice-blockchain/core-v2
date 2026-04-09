import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { SheetCloseHeader, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { UserSearchList } from "@ion/user-search-ui";
import type { SearchableUser } from "@ion/user-search";

const CONTENT_STYLE: ViewStyle = { flex: 1 };

interface NewChatSheetContentProps {
  readonly onClose: () => void;
  readonly onSelectUser: ((user: SearchableUser) => void) | undefined;
}

export function NewChatSheetContent({ onClose, onSelectUser }: NewChatSheetContentProps) {
  const theme = useTheme();

  return (
    <View style={CONTENT_STYLE}>
      <SheetCloseHeader title={translate("chat:newChatTitle")} onClose={onClose} closeIconColor={theme.colors.primaryText} testID="new-chat-close" />
      <UserSearchList onSelectUser={onSelectUser} testID="new-chat-user-search" />
    </View>
  );
}
