import { useMemo } from "react";
import { View } from "react-native";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { colorPalette } from "@ion/ui";
import { MediaImage } from "@ion/media-viewer";
import type { MediaViewerSource } from "@ion/media-viewer";

export interface NotificationCardProps {
  avatar: MediaViewerSource;
  title: string;
  description: string;
  time: string;
  showBadge?: boolean;
  testID?: string;
}

function buildCardStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor,
    borderRadius: scale(16),
    padding: scale(10),
    gap: scale(12),
  };
}

function buildAvatarContainerStyle(scale: (n: number) => number): ViewStyle {
  return { width: scale(38), height: scale(38) };
}

function buildAvatarStyle(scale: (n: number) => number): ImageStyle {
  return { width: scale(36), height: scale(36), borderRadius: scale(10) };
}

function buildBadgeStyle(scale: (n: number) => number, borderColor: string): ViewStyle {
  return {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: scale(13),
    height: scale(13),
    borderRadius: scale(4),
    backgroundColor: colorPalette.darkBlue,
    borderWidth: scale(0.85),
    borderColor,
    alignItems: "center",
    justifyContent: "center",
  };
}

function buildTitleStyle(color: string): TextStyle {
  return { color, flexShrink: 1 };
}

function buildMutedTextStyle(color: string): TextStyle {
  return { color };
}

const textContainerStyle: ViewStyle = { flex: 1 };

function useCardStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { colors } = theme;

  return {
    scale,
    colors,
    card: useMemo(() => buildCardStyle(scale, colors.primaryAccent), [scale, colors.primaryAccent]),
    avatarContainer: useMemo(() => buildAvatarContainerStyle(scale), [scale]),
    avatar: useMemo(() => buildAvatarStyle(scale), [scale]),
    badge: useMemo(() => buildBadgeStyle(scale, colors.onPrimaryAccent), [scale, colors.onPrimaryAccent]),
    titleRow: useMemo(() => ({ flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "flex-start" as const }), []),
    title: useMemo(() => buildTitleStyle(colors.onPrimaryAccent), [colors.onPrimaryAccent]),
    muted: useMemo(() => buildMutedTextStyle(colors.onColors), [colors.onColors]),
  };
}

export function NotificationCard({ avatar, title, description, time, showBadge, testID }: NotificationCardProps) {
  const s = useCardStyles();

  return (
    <View style={s.card} testID={testID}>
      <View style={s.avatarContainer}>
        <MediaImage source={avatar} style={s.avatar} />
        {showBadge ? (
          <View style={s.badge}>
            <Icon name="login-ice-logo" size={s.scale(8)} color={s.colors.onPrimaryAccent} />
          </View>
        ) : null}
      </View>
      <View style={textContainerStyle}>
        <View style={s.titleRow}>
          <Text variant="body" style={s.title} numberOfLines={1}>{title}</Text>
          <Text variant="caption3" style={s.muted}>{time}</Text>
        </View>
        <Text variant="caption3" style={s.muted} numberOfLines={1}>{description}</Text>
      </View>
    </View>
  );
}
