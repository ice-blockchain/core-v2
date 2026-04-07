import { useMemo } from 'react';
import { View } from 'react-native';
import { Icon, Text, useTheme } from '@ion/ui';
import { translate } from '@ion/localization';

function useVisibilityBarStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(
    () => ({
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: scale(16),
      paddingVertical: scale(8),
      borderTopWidth: 0.5,
      borderTopColor: theme.colors.onTertiaryFill,
    }),
    [theme, scale],
  );

  const leftSectionStyle = useMemo(
    () => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: scale(4) }),
    [scale],
  );

  return { containerStyle, leftSectionStyle, scale, accentColor: theme.colors.primaryAccent };
}

export function CreatePostVisibilityBar() {
  const { containerStyle, leftSectionStyle, scale, accentColor } = useVisibilityBarStyles();

  return (
    <View style={containerStyle}>
      <View style={leftSectionStyle}>
        <Icon name="post-everyone" size={scale(24)} color={accentColor} />
        <Text variant="caption" color={accentColor}>{translate('feed:everyoneLabel')}</Text>
      </View>
      <Icon name="chevron-right" size={scale(16)} color={accentColor} />
    </View>
  );
}
