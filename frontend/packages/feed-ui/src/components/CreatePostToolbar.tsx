import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, useTheme } from '@ion/ui';

function ToolbarIcons() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const iconRowStyle = useMemo(
    () => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: scale(12) }),
    [scale],
  );

  return (
    <View style={iconRowStyle}>
      <Icon name="gallery-open" size={scale(24)} color={theme.colors.primaryAccent} />
      <Icon name="post-poll" size={scale(24)} color={theme.colors.primaryAccent} />
      <Icon name="post-bold" size={scale(24)} color={theme.colors.primaryAccent} />
      <Icon name="post-italic" size={scale(24)} color={theme.colors.primaryAccent} />
    </View>
  );
}

function DisabledSendButton() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const sendButtonStyle = useMemo(
    () => ({
      width: scale(48),
      height: scale(28),
      borderRadius: scale(16),
      backgroundColor: theme.colors.sheetLine,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    }),
    [theme, scale],
  );

  return (
    <View style={sendButtonStyle}>
      <View style={styles.sendIconFlip}>
        <Icon name="post-send" size={scale(20)} color={theme.colors.onPrimaryAccent} />
      </View>
    </View>
  );
}

export function CreatePostToolbar() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(
    () => ({
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: scale(16),
      paddingTop: scale(8),
      paddingBottom: scale(16),
      borderTopWidth: 0.5,
      borderTopColor: theme.colors.onTertiaryFill,
    }),
    [theme, scale],
  );

  return (
    <View style={containerStyle}>
      <ToolbarIcons />
      <DisabledSendButton />
    </View>
  );
}

const styles = StyleSheet.create({
  sendIconFlip: {
    transform: [{ scaleY: -1 }],
  },
});
