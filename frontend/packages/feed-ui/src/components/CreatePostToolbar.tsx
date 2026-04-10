import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, useTheme } from '@ion/ui';
import { translate } from '@ion/localization';

import type { RichTextFormatState } from './rich-text-editor-types';

interface ToolbarIconsProps {
  onGalleryPress?: (() => void) | undefined;
  formatState: RichTextFormatState;
  onToggleBold: () => void;
  onToggleItalic: () => void;
}

function ToolbarIcons({ onGalleryPress, formatState, onToggleBold, onToggleItalic }: ToolbarIconsProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const color = theme.colors.primaryAccent;

  const iconRowStyle = useMemo(
    () => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: scale(12) }),
    [scale],
  );

  return (
    <View style={iconRowStyle}>
      <Pressable onPress={onGalleryPress} hitSlop={8} disabled={!onGalleryPress} accessibilityRole="button" accessibilityLabel={translate('feed:galleryButtonLabel')} accessibilityState={{ disabled: !onGalleryPress }}>
        <Icon name="gallery-open" size={scale(24)} color={color} />
      </Pressable>
      <Icon name="post-poll" size={scale(24)} color={color} />
      <Pressable onPress={onToggleBold} hitSlop={8} accessibilityRole="button" accessibilityLabel={translate('feed:boldButtonLabel')} accessibilityState={{ selected: formatState.isBold }}>
        <Icon name={formatState.isBold ? 'post-bold-active' : 'post-bold'} size={scale(24)} color={color} />
      </Pressable>
      <Pressable onPress={onToggleItalic} hitSlop={8} accessibilityRole="button" accessibilityLabel={translate('feed:italicButtonLabel')} accessibilityState={{ selected: formatState.isItalic }}>
        <Icon name={formatState.isItalic ? 'post-italic-active' : 'post-italic'} size={scale(24)} color={color} />
      </Pressable>
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

interface CreatePostToolbarProps {
  onGalleryPress?: () => void;
  formatState: RichTextFormatState;
  onToggleBold: () => void;
  onToggleItalic: () => void;
}

export function CreatePostToolbar({ onGalleryPress, formatState, onToggleBold, onToggleItalic }: CreatePostToolbarProps) {
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
      <ToolbarIcons onGalleryPress={onGalleryPress} formatState={formatState} onToggleBold={onToggleBold} onToggleItalic={onToggleItalic} />
      <DisabledSendButton />
    </View>
  );
}

const styles = StyleSheet.create({
  sendIconFlip: {
    transform: [{ scaleY: -1 }],
  },
});
