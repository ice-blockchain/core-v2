import { useMemo } from 'react';
import { Pressable } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Icon, Text, useTheme } from '@ion/ui';
import { translate } from '@ion/localization';

interface CameraTileProps {
  onPress: () => void;
  isDisabled?: boolean;
}

function buildTileStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flex: 1,
    aspectRatio: 1,
    backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(2),
  };
}

export function CameraTile({ onPress, isDisabled }: CameraTileProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const tileStyle = useMemo(
    () => buildTileStyle(scale, theme.colors.onTertiaryFill),
    [scale, theme.colors],
  );

  const opacityStyle = useMemo(
    () => (isDisabled ? { opacity: 0.5 } : undefined),
    [isDisabled],
  );

  return (
    <Pressable style={[tileStyle, opacityStyle]} onPress={onPress} disabled={isDisabled}>
      <Icon name="camera" size={scale(40)} color={theme.colors.primaryAccent} />
      <Text variant="body" color={theme.colors.primaryAccent}>
        {translate('feed:cameraLabel')}
      </Text>
    </Pressable>
  );
}
