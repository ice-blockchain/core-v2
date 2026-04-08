import { useMemo } from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Text, useTheme } from '@ion/ui';

interface SelectionBadgeProps {
  order?: number | undefined;
}

function buildUnselectedStyle(scale: (n: number) => number, borderColor: string): ViewStyle {
  return {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor,
  };
}

function buildSelectedStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
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
