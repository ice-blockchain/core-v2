import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Icon, useTheme } from '@ion/ui';

interface SheetScreenHeaderProps {
  onBack?: () => void;
}

function buildHeaderStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(8),
  };
}

export function SheetScreenHeader({ onBack }: SheetScreenHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildHeaderStyle(scale), [scale]);

  if (!onBack) return null;

  return (
    <View style={headerStyle}>
      <Pressable onPress={onBack} hitSlop={8} testID="sheet-back-button">
        <Icon name="back-arrow" size={scale(24)} color={theme.colors.primaryText} />
      </Pressable>
    </View>
  );
}
