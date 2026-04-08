import { useMemo } from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Text, useTheme } from '@ion/ui';

const BADGE_SIZE = 20;
const BADGE_RADIUS = 10;
const BADGE_BORDER_WIDTH = 1;

interface SelectionBadgeProps {
  order?: number | undefined;
}

function buildUnselectedStyle(scale: (n: number) => number, borderColor: string): ViewStyle {
  return {
    width: scale(BADGE_SIZE),
    height: scale(BADGE_SIZE),
    borderRadius: scale(BADGE_RADIUS),
    borderWidth: BADGE_BORDER_WIDTH,
    borderColor,
  };
}

function buildSelectedStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    width: scale(BADGE_SIZE),
    height: scale(BADGE_SIZE),
    borderRadius: scale(BADGE_RADIUS),
    backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

export function SelectionBadge({ order }: SelectionBadgeProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const style = useMemo(() => {
    if (order !== undefined) return buildSelectedStyle(scale, theme.colors.primaryAccent);
    return buildUnselectedStyle(scale, theme.colors.secondaryText);
  }, [order, scale, theme.colors]);

  if (order === undefined) return <View style={style} />;

  return (
    <View style={style}>
      <Text variant="caption" color={theme.colors.onPrimaryAccent}>{String(order)}</Text>
    </View>
  );
}
