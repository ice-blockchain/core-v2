import { useMemo } from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Text, useTheme } from '@ion/ui';
import { formatDuration } from './format-duration';

interface VideoDurationBadgeProps {
  durationMs: number;
}

function buildBadgeStyle(scale: (n: number) => number): ViewStyle {
  return {
    paddingHorizontal: scale(4),
    paddingBottom: 1,
    borderRadius: scale(6),
    backgroundColor: 'rgba(8, 21, 50, 0.7)',
  };
}

export function VideoDurationBadge({ durationMs }: VideoDurationBadgeProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const badgeStyle = useMemo(() => buildBadgeStyle(scale), [scale]);

  return (
    <View style={badgeStyle}>
      <Text variant="caption5" color={theme.colors.onPrimaryAccent}>
        {formatDuration(durationMs)}
      </Text>
    </View>
  );
}
