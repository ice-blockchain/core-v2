import { useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";
import type { ViewStyle } from "react-native";
import { Icon, SearchBar, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { buildSearchContainerStyle } from "./new-chat-sheet-styles";
import { newChatEmptyStateImage, newChatEmptyStateDarkImage } from "./chat-images";

function buildHeaderStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingTop: scale(20),
    paddingBottom: scale(16),
    borderTopLeftRadius: scale(30),
    borderTopRightRadius: scale(30),
    backgroundColor,
  };
}

function SheetHeader({ onClose }: { readonly onClose: () => void }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const iconSize = scale(24);
  const headerStyle = useMemo(() => buildHeaderStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors.secondaryBackground]);
  const spacerStyle = useMemo((): ViewStyle => ({ width: iconSize }), [iconSize]);

  return (
    <View style={headerStyle}>
      <View style={spacerStyle} />
      <Text variant="subtitle">{translate("chat:newChatTitle")}</Text>
      <Pressable onPress={onClose} hitSlop={8} testID="new-chat-close">
        <Icon name="sheet-close" size={iconSize} color={theme.colors.primaryText} />
      </Pressable>
    </View>
  );
}

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
  const scale = useTheme().scale.scaleSize;
  const [searchQuery, setSearchQuery] = useState("");
  const searchStyle = useMemo(() => buildSearchContainerStyle(scale), [scale]);

  return (
    <View style={CONTENT_STYLE}>
      <SheetHeader onClose={onClose} />
      <View style={searchStyle}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} testID="new-chat-search" />
      </View>
      <EmptyState />
    </View>
  );
}
