import { useMemo } from "react";
import { View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { MediaImage } from "@ion/media-viewer";
import type { SearchableUser } from "@ion/user-search";
import { buildRowStyle, buildLeftSectionStyle, buildAvatarStyle, buildNameRowStyle } from "./user-search-row-styles";

export interface UserSearchRowProps {
  user: SearchableUser;
  onPress?: ((user: SearchableUser) => void) | undefined;
  testID?: string;
}

export function UserSearchRow({ user, testID }: UserSearchRowProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { colors } = theme;

  const rowStyle = useMemo(() => buildRowStyle(), []);
  const leftStyle = useMemo(() => buildLeftSectionStyle(scale), [scale]);
  const avatarStyle = useMemo(() => buildAvatarStyle(scale, colors.secondaryBackground), [scale, colors.secondaryBackground]);
  const nameRowStyle = useMemo(() => buildNameRowStyle(scale), [scale]);

  return (
    <View style={rowStyle} testID={testID}>
      <View style={leftStyle}>
        {user.avatarUrl ? (
          <MediaImage source={{ uri: user.avatarUrl, mimeType: "image/*" }} style={avatarStyle} />
        ) : (
          <View style={avatarStyle} />
        )}
        <View style={{ flexShrink: 1 }}>
          <View style={nameRowStyle}>
            <Text variant="subtitle3" numberOfLines={1}>{user.displayName}</Text>
            {user.isVerified && <Icon name="badge-verify" size={scale(16)} color={colors.primaryAccent} />}
          </View>
          <Text variant="caption" color={colors.tertiaryText} numberOfLines={1}>@{user.username}</Text>
        </View>
      </View>
    </View>
  );
}
