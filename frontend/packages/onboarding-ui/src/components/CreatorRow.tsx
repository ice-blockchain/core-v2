import { useCallback, useMemo } from "react";
import { View } from "react-native";
import type { ImageStyle, ViewStyle } from "react-native";
import { Icon, SmallButton, Text, useTheme } from "@ion/ui";
import type { SemanticColors } from "@ion/ui";
import { translate } from "@ion/localization";
import { MediaImage } from "@ion/media-viewer";

export interface CreatorRowProps {
  avatarUrl: string;
  name: string;
  handle: string;
  isVerified: boolean;
  isFollowing: boolean;
  onToggleFollow: () => void;
  testID?: string;
}

function buildRowStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor,
    borderRadius: scale(16),
    padding: scale(12),
  };
}

function buildLeftSectionStyle(scale: (n: number) => number): ViewStyle {
  return { flexDirection: "row", alignItems: "center", gap: scale(10), flex: 1 };
}

function buildAvatarStyle(scale: (n: number) => number, backgroundColor: string): ImageStyle {
  return {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(10),
    backgroundColor,
  };
}

function buildInfoStyle(): ViewStyle {
  return { flexShrink: 1 };
}

function buildNameRowStyle(scale: (n: number) => number): ViewStyle {
  return { flexDirection: "row", alignItems: "center", gap: scale(4) };
}

function FollowButton({ isFollowing, onToggleFollow, scale, colors }: {
  isFollowing: boolean;
  onToggleFollow: () => void;
  scale: (n: number) => number;
  colors: SemanticColors;
}) {
  const icon = (
    <Icon
      name={isFollowing ? "person-following" : "person-add"}
      size={scale(14)}
      color={isFollowing ? colors.primaryAccent : colors.onPrimaryAccent}
    />
  );

  return (
    <SmallButton
      color={isFollowing ? "primaryOutlined" : "primary"}
      icon={icon}
      label={isFollowing ? translate("onboarding:followingButton") : translate("onboarding:followButton")}
      onPress={onToggleFollow}
    />
  );
}

export function CreatorRow({ avatarUrl, name, handle, isVerified, isFollowing, onToggleFollow, testID }: CreatorRowProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { colors } = theme;

  const rowStyle = useMemo(() => buildRowStyle(scale, colors.tertiaryBackground), [scale, colors.tertiaryBackground]);
  const leftStyle = useMemo(() => buildLeftSectionStyle(scale), [scale]);
  const avatarStyle = useMemo(() => buildAvatarStyle(scale, colors.secondaryBackground), [scale, colors.secondaryBackground]);
  const nameRowStyle = useMemo(() => buildNameRowStyle(scale), [scale]);
  const handlePress = useCallback(() => onToggleFollow(), [onToggleFollow]);

  return (
    <View style={rowStyle} testID={testID}>
      <View style={leftStyle}>
        {avatarUrl ? <MediaImage source={{ uri: avatarUrl, mimeType: "image/*" }} style={avatarStyle} /> : <View style={avatarStyle} />}
        <View style={buildInfoStyle()}>
          <View style={nameRowStyle}>
            <Text variant="body" numberOfLines={1}>{name}</Text>
            {isVerified && <Icon name="badge-verify" size={scale(14)} color={colors.primaryAccent} />}
          </View>
          <Text variant="caption" color={colors.tertiaryText} numberOfLines={1}>@{handle}</Text>
        </View>
      </View>
      <FollowButton isFollowing={isFollowing} onToggleFollow={handlePress} scale={scale} colors={colors} />
    </View>
  );
}
