import { useMemo } from 'react';
import { TextInput, View } from 'react-native';
import { Icon, useTheme } from '@ion/ui';
import { translate } from '@ion/localization';

function PlaceholderAvatar() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const avatarStyle = useMemo(
    () => ({
      width: scale(30),
      height: scale(30),
      borderRadius: scale(10),
      backgroundColor: theme.colors.sheetLine,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    }),
    [theme, scale],
  );

  return (
    <View style={avatarStyle}>
      <Icon name="profile-noimage" size={scale(20)} color={theme.colors.secondaryText} />
    </View>
  );
}

function useComposerStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(
    () => ({
      flexDirection: 'row' as const,
      gap: scale(10),
      paddingHorizontal: scale(16),
      paddingTop: scale(12),
      flex: 1,
    }),
    [scale],
  );

  const inputStyle = useMemo(
    () => ({
      flex: 1,
      fontSize: scale(13),
      color: theme.colors.primaryText,
      paddingTop: 0,
      paddingBottom: 0,
      textAlignVertical: 'top' as const,
    }),
    [theme, scale],
  );

  return { containerStyle, inputStyle, placeholderColor: theme.colors.quaternaryText, selectionColor: theme.colors.primaryAccent };
}

export function CreatePostComposer() {
  const { containerStyle, inputStyle, placeholderColor, selectionColor } = useComposerStyles();

  return (
    <View style={containerStyle}>
      <PlaceholderAvatar />
      <TextInput
        style={inputStyle}
        placeholder={translate('feed:composerPlaceholder')}
        placeholderTextColor={placeholderColor}
        multiline
        autoFocus
        selectionColor={selectionColor}
        testID="create-post-input"
      />
    </View>
  );
}
