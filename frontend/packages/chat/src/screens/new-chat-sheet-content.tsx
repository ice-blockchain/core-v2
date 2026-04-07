import { useMemo, useState } from "react";
import { Image, View } from "react-native";
import type { ViewStyle } from "react-native";
import { SearchBar, SheetCloseHeader, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { buildSearchContainerStyle } from "./new-chat-sheet-styles";
import { newChatEmptyStateImage, newChatEmptyStateDarkImage } from "./chat-images";

const EMPTY_STATE_STYLE: ViewStyle = { flex: 1, alignItems: "center", justifyContent: "center" };
const CAPTION_STYLE = { textAlign: "center" } as const;

function EmptyState() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const imageStyle = useMemo(() => ({ width: scale(48), height: scale(48) }), [scale]);
  const innerStyle = useMemo(() => ({ alignItems: "center" as const, gap: scale(8), width: scale(186) }), [scale]);

  return (
    <View style={EMPTY_STATE_STYLE}>
      <View style={innerStyle}>
        <Image source={theme.colorMode === "dark" ? newChatEmptyStateDarkImage : newChatEmptyStateImage} style={imageStyle} />
        <Text variant="caption2" color={theme.colors.onTertiaryBackground} style={CAPTION_STYLE}>
          {translate("chat:newChatEmptyState")}
        </Text>
      </View>
    </View>
  );
}

const CONTENT_STYLE: ViewStyle = { flex: 1 };

export function NewChatSheetContent({ onClose }: { readonly onClose: () => void }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const [searchQuery, setSearchQuery] = useState("");
  const searchStyle = useMemo(() => buildSearchContainerStyle(scale), [scale]);

  return (
    <View style={CONTENT_STYLE}>
      <SheetCloseHeader title={translate("chat:newChatTitle")} onClose={onClose} closeIconColor={theme.colors.primaryText} testID="new-chat-close" />
      <View style={searchStyle}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} testID="new-chat-search" />
      </View>
      <EmptyState />
    </View>
  );
}
