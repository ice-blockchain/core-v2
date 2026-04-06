import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from '@ion/ui';
import { translate } from '@ion/localization';

export function TopicTooltipContent() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.tertiaryBackground,
      borderRadius: scale(16),
      paddingHorizontal: scale(20),
      paddingVertical: scale(12),
      width: scale(295),
      gap: scale(8),
    }),
    [theme, scale],
  );

  return (
    <View style={containerStyle}>
      <View style={styles.titleRow}>
        <Icon name="post-topic" size={scale(20)} color={theme.colors.primaryText} />
        <Text variant="subtitle3" color={theme.colors.primaryText}>
          {translate('feed:topicTooltipTitle')}
        </Text>
      </View>
      <Text variant="caption2" color={theme.colors.primaryText}>
        {translate('feed:topicTooltipDescription')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
