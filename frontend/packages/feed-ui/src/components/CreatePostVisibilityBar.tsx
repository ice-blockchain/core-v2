import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from '@ion/ui';
import { translate } from '@ion/localization';

export function CreatePostVisibilityBar() {
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

  return (
    <View style={containerStyle}>
      <View style={styles.leftSection}>
        <Icon name="post-everyone" size={scale(24)} color={theme.colors.primaryAccent} />
        <Text variant="caption" color={theme.colors.primaryAccent}>
          {translate('feed:everyoneLabel')}
        </Text>
      </View>
      <Icon name="chevron-right" size={scale(16)} color={theme.colors.primaryAccent} />
    </View>
  );
}

const styles = StyleSheet.create({
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
