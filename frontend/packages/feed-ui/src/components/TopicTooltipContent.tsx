import { useMemo } from 'react';
import { View } from 'react-native';
import { Icon, Text, useTheme } from '@ion/ui';
import { translate } from '@ion/localization';

function useTooltipStyles() {
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

  const titleRowStyle = useMemo(
    () => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: scale(2) }),
    [scale],
  );

  return { containerStyle, titleRowStyle, scale, textColor: theme.colors.primaryText };
}

export function TopicTooltipContent() {
  const { containerStyle, titleRowStyle, scale, textColor } = useTooltipStyles();

  return (
    <View style={containerStyle}>
      <View style={titleRowStyle}>
        <Icon name="post-topic" size={scale(20)} color={textColor} />
        <Text variant="subtitle3" color={textColor}>{translate('feed:topicTooltipTitle')}</Text>
      </View>
      <Text variant="caption2" color={textColor}>{translate('feed:topicTooltipDescription')}</Text>
    </View>
  );
}
