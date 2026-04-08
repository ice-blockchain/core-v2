import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { SheetCloseHeader, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { UserSearchList } from "@ion/user-search-ui";

const CONTENT_STYLE: ViewStyle = { flex: 1 };

export function NewChatSheetContent({ onClose }: { readonly onClose: () => void }) {
  const theme = useTheme();

  return (
    <View style={CONTENT_STYLE}>
      <SheetCloseHeader title={translate("chat:newChatTitle")} onClose={onClose} closeIconColor={theme.colors.primaryText} testID="new-chat-close" />
      <UserSearchList listComponent={BottomSheetFlatList} testID="new-chat-user-search" />
    </View>
  );
}
