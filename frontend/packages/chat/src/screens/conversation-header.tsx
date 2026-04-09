import { useMemo } from "react";
import { Image, Pressable, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import {
  buildHeaderContainerStyle,
  buildHeaderLeftStyle,
  buildHeaderUserInfoStyle,
  buildHeaderAvatarStyle,
  buildHeaderNameRowStyle,
  buildHeaderNameContainerStyle,
} from "./conversation-screen-styles";

interface ConversationHeaderProps {
  readonly name: string;
  readonly username: string | undefined;
  readonly avatarUrl: string | undefined;
  readonly isVerified: boolean | undefined;
  readonly onBack: () => void;
  readonly onMorePress: () => void;
}

function useHeaderStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return {
    container: useMemo(() => buildHeaderContainerStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors.secondaryBackground]),
    left: useMemo(() => buildHeaderLeftStyle(scale), [scale]),
    userInfo: useMemo(() => buildHeaderUserInfoStyle(scale), [scale]),
    avatar: useMemo(() => buildHeaderAvatarStyle(scale), [scale]),
    nameContainer: useMemo(() => buildHeaderNameContainerStyle(scale), [scale]),
    nameRow: useMemo(() => buildHeaderNameRowStyle(), []),
  };
}

function HeaderAvatar({ name, avatarUrl }: { readonly name: string; readonly avatarUrl: string | undefined }) {
  const theme = useTheme();
  const styles = useHeaderStyles();

  if (avatarUrl) {
    const { width, height, borderRadius } = styles.avatar;
    return <Image source={{ uri: avatarUrl }} style={{ width, height, borderRadius }} />;
  }

  const fallbackStyle = useMemo(() => [styles.avatar, { backgroundColor: theme.colors.primaryBackground }], [styles.avatar, theme.colors.primaryBackground]);
  return (
    <View style={fallbackStyle}>
      <Text variant="subtitle3" color={theme.colors.primaryAccent}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function ConversationHeader({ name, username, avatarUrl, isVerified, onBack, onMorePress }: ConversationHeaderProps) {
  const theme = useTheme();
  const styles = useHeaderStyles();

  return (
    <View style={styles.container} testID="conversation-header">
      <View style={styles.left}>
        <Pressable onPress={onBack} testID="conversation-back-button">
          <Icon name="chat-back" size={24} color={theme.colors.onTertiaryBackground} />
        </Pressable>
        <View style={styles.userInfo}>
          <HeaderAvatar name={name} avatarUrl={avatarUrl} />
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text variant="subtitle3" numberOfLines={1}>{name}</Text>
              {isVerified ? <Icon name="badge-verify" size={16} color={theme.colors.primaryAccent} /> : null}
            </View>
            {username ? <Text variant="caption" color={theme.colors.quaternaryText} numberOfLines={1}>@{username}</Text> : null}
          </View>
        </View>
      </View>
      <Pressable onPress={onMorePress} testID="conversation-more-button">
        <Icon name="more-popup" size={24} color={theme.colors.quaternaryText} />
      </Pressable>
    </View>
  );
}
