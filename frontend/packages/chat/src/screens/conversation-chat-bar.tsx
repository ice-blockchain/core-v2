import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import {
  buildChatBarContainerStyle,
  buildChatBarIconButtonStyle,
  buildChatBarInputContainerStyle,
  buildChatBarInputStyle,
} from "./conversation-screen-styles";

function useChatBarStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return {
    container: useMemo(() => buildChatBarContainerStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors.secondaryBackground]),
    iconButton: useMemo(() => buildChatBarIconButtonStyle(scale), [scale]),
    inputContainer: useMemo(
      () => buildChatBarInputContainerStyle(scale, theme.colors.onSecondaryBackground),
      [scale, theme.colors.onSecondaryBackground],
    ),
    input: useMemo(() => buildChatBarInputStyle(), []),
  };
}

export function ConversationChatBar() {
  const theme = useTheme();
  const styles = useChatBarStyles();

  return (
    <View style={styles.container} testID="conversation-chat-bar">
      <Pressable style={styles.iconButton}>
        <Icon name="chat-attach" size={24} color={theme.colors.primaryText} />
      </Pressable>
      <View style={styles.inputContainer}>
        <Text variant="body2" color={theme.colors.quaternaryText}>
          {translate("chat:writeMessagePlaceholder")}
        </Text>
      </View>
      <Pressable style={styles.iconButton}>
        <Icon name="camera" size={24} color={theme.colors.primaryText} />
      </Pressable>
      <Pressable style={styles.iconButton}>
        <Icon name="chat-microphone" size={24} color={theme.colors.primaryText} />
      </Pressable>
    </View>
  );
}
