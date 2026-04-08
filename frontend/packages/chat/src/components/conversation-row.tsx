import { useMemo } from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { Text, useTheme } from "@ion/ui";
import type { Conversation } from "../types";
import { ChatArchiveIcon } from "../icons/ChatArchiveIcon";

type ScaleFunction = (n: number) => number;

function buildRowStyle(scale: ScaleFunction): ViewStyle {
  return { flex: 1, flexDirection: "row", alignItems: "center", gap: scale(12), paddingVertical: scale(8) };
}

function buildAvatarStyle(scale: ScaleFunction, backgroundColor: string): ViewStyle {
  const size = scale(48);
  return { width: size, height: size, borderRadius: scale(12), backgroundColor, alignItems: "center", justifyContent: "center", flexShrink: 0 };
}

function buildFolderAvatarStyle(scale: ScaleFunction, backgroundColor: string, borderColor: string): ViewStyle {
  const size = scale(48);
  return { width: size, height: size, borderRadius: scale(12), backgroundColor, borderWidth: 1, borderColor, alignItems: "center", justifyContent: "center", flexShrink: 0 };
}

function buildUnreadBadgeStyle(backgroundColor: string): ViewStyle {
  return { minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor, alignItems: "center", justifyContent: "center" };
}

const INFO_STYLE: ViewStyle = { flex: 1, gap: 2 };
const TIME_COLUMN_STYLE: ViewStyle = { alignItems: "flex-end", justifyContent: "center", gap: 6, width: 40, alignSelf: "stretch" };

function ConversationAvatar({ name }: { readonly name: string }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const avatarStyle = useMemo(
    () => buildAvatarStyle(scale, theme.colors.primaryBackground),
    [scale, theme.colors.primaryBackground],
  );
  return (
    <View style={avatarStyle}>
      <Text variant="subtitle3" color={theme.colors.primaryAccent}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function FolderAvatar() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const avatarStyle = useMemo(
    () => buildFolderAvatarStyle(scale, theme.colors.primaryBackground, theme.colors.onTertiaryFill),
    [scale, theme.colors.primaryBackground, theme.colors.onTertiaryFill],
  );
  return (
    <View style={avatarStyle}>
      <ChatArchiveIcon size={scale(24)} color={theme.colors.primaryAccent} />
    </View>
  );
}

const BADGE_TEXT_STYLE = { includeFontPadding: false } as const;

function UnreadBadge({ count }: { readonly count: number }) {
  const theme = useTheme();
  const badgeStyle = useMemo(() => buildUnreadBadgeStyle(theme.colors.primaryAccent), [theme.colors.primaryAccent]);
  return (
    <View style={badgeStyle}>
      <Text variant="caption5" color={theme.colors.onPrimaryAccent} style={BADGE_TEXT_STYLE}>{count > 99 ? "99+" : String(count)}</Text>
    </View>
  );
}

export function ConversationRow({ conversation }: { readonly conversation: Conversation }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const rowStyle = useMemo(() => buildRowStyle(scale), [scale]);
  return (
    <View style={rowStyle}>
      {conversation.isFolder ? <FolderAvatar /> : <ConversationAvatar name={conversation.name} />}
      <View style={INFO_STYLE}>
        <Text variant="subtitle3" numberOfLines={1}>{conversation.name}</Text>
        <Text variant="body2" color={theme.colors.onTertiaryBackground} numberOfLines={1}>{conversation.preview}</Text>
      </View>
      <View style={TIME_COLUMN_STYLE}>
        <Text variant="caption" color={theme.colors.tertiaryText}>{conversation.time}</Text>
        {conversation.unreadCount !== undefined && conversation.unreadCount > 0 && <UnreadBadge count={conversation.unreadCount} />}
      </View>
    </View>
  );
}
