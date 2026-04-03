import { useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Icon, SearchBar, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import {
  buildSheetHeaderStyle,
  buildSearchContainerStyle,
  buildEmptyStateStyle,
  buildEmptyStateInnerStyle,
  buildEmptyStateImageStyle,
  buildCenteredTextStyle,
} from "./new-chat-sheet-styles";
import { chatEmptyStateImage } from "./chat-images";

function SheetHeader({ onClose }: { readonly onClose: () => void }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const iconSize = scale(24);
  const headerStyle = useMemo(() => buildSheetHeaderStyle(scale), [scale]);

  return (
    <View style={headerStyle}>
      <View style={{ width: iconSize, height: iconSize }} />
      <Text variant="subtitle">{translate("chat:newChatTitle")}</Text>
      <Pressable onPress={onClose} hitSlop={8} testID="new-chat-close">
        <Icon name="sheet-close" size={iconSize} color={theme.colors.primaryText} />
      </Pressable>
    </View>
  );
}

function EmptyState() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const emptyStyle = useMemo(() => buildEmptyStateStyle(), []);
  const innerStyle = useMemo(() => buildEmptyStateInnerStyle(scale), [scale]);
  const imageStyle = useMemo(() => buildEmptyStateImageStyle(scale), [scale]);
  const textStyle = useMemo(() => buildCenteredTextStyle(), []);

  return (
    <View style={emptyStyle}>
      <View style={innerStyle}>
        <Image source={chatEmptyStateImage} style={imageStyle} />
        <Text variant="caption2" color={theme.colors.onTertiaryBackground} style={textStyle}>
          {translate("chat:newChatEmptyState")}
        </Text>
      </View>
    </View>
  );
}

export function NewChatSheetContent({ onClose }: { readonly onClose: () => void }) {
  const scale = useTheme().scale.scaleSize;
  const [searchQuery, setSearchQuery] = useState("");
  const searchStyle = useMemo(() => buildSearchContainerStyle(scale), [scale]);

  return (
    <View style={{ flex: 1 }}>
      <SheetHeader onClose={onClose} />
      <View style={searchStyle}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} testID="new-chat-search" />
      </View>
      <EmptyState />
    </View>
  );
}
