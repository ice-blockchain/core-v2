import { useMemo } from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { Text, useTheme } from "@ion/ui";
import type { Conversation } from "../types";

export { type Conversation };

export const MOCK_CONVERSATIONS: readonly Conversation[] = [
  { id: "1", name: "Archive", preview: "OXK Community, Binance Labs...", time: "11:23", unreadCount: 9 },
  { id: "2", name: "Alicia Wernet", preview: "Hey, did you receive the news?", time: "09:31", unreadCount: 1 },
  { id: "3", name: "Ton Community", preview: "Photo", time: "08:11" },
  { id: "4", name: "Ice Open Network", preview: "Hi, Join us for an exclusive AMA...", time: "31.09" },
  { id: "5", name: "Diedo Shonli", preview: "Are you sure? I haven't heard of.", time: "30.09" },
  { id: "6", name: "Bitcoin Adept", preview: "In the coming days, we will find out...", time: "30.09", unreadCount: 1 },
];

type ScaleFn = (n: number) => number;

function buildRowStyle(scale: ScaleFn): ViewStyle {
  return { flex: 1, flexDirection: "row", alignItems: "center", gap: scale(12), paddingVertical: scale(8) };
}

function buildAvatarStyle(scale: ScaleFn, backgroundColor: string): ViewStyle {
  const size = scale(48);
  return { width: size, height: size, borderRadius: scale(12), backgroundColor, alignItems: "center", justifyContent: "center", flexShrink: 0 };
}

function buildUnreadBadgeStyle(backgroundColor: string): ViewStyle {
  return { width: 16, height: 16, borderRadius: 8, backgroundColor, alignItems: "center", justifyContent: "center" };
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

const BADGE_TEXT_STYLE = { includeFontPadding: false } as const;

function UnreadBadge({ count }: { readonly count: number }) {
  const theme = useTheme();
  const badgeStyle = useMemo(() => buildUnreadBadgeStyle(theme.colors.primaryAccent), [theme.colors.primaryAccent]);
  return (
    <View style={badgeStyle}>
      <Text variant="caption5" color={theme.colors.onPrimaryAccent} style={BADGE_TEXT_STYLE}>{String(count)}</Text>
    </View>
  );
}

export function ConversationRow({ conversation }: { readonly conversation: Conversation }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const rowStyle = useMemo(() => buildRowStyle(scale), [scale]);
  return (
    <View style={rowStyle}>
      <ConversationAvatar name={conversation.name} />
      <View style={INFO_STYLE}>
        <Text variant="subtitle3" numberOfLines={1}>{conversation.name}</Text>
        <Text variant="body2" color={theme.colors.onTertiaryBackground} numberOfLines={1}>{conversation.preview}</Text>
      </View>
      <View style={TIME_COLUMN_STYLE}>
        <Text variant="caption" color={theme.colors.tertiaryText}>{conversation.time}</Text>
        {conversation.unreadCount !== undefined && <UnreadBadge count={conversation.unreadCount} />}
      </View>
    </View>
  );
}
