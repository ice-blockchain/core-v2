import { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface TooltipArrowProps {
  direction: 'up' | 'down';
}

export function TooltipArrow({ direction }: TooltipArrowProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const arrowStyle = useMemo(() => {
    const size = scale(7.5);
    const halfWidth = scale(6);
    return {
      width: 0,
      height: 0,
      borderLeftWidth: halfWidth,
      borderRightWidth: halfWidth,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      ...(direction === 'down'
        ? { borderTopWidth: size, borderTopColor: theme.colors.tertiaryBackground }
        : { borderBottomWidth: size, borderBottomColor: theme.colors.tertiaryBackground }),
    };
  }, [theme, scale, direction]);

  return <View style={arrowStyle} />;
}
