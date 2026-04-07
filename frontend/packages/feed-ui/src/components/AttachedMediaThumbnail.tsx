import { useMemo } from 'react';
import { Pressable, View, Image } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Icon, useTheme } from '@ion/ui';

interface AttachedMediaThumbnailProps {
  uri: string;
  onRemove: () => void;
}

function buildThumbnailStyle(scale: (n: number) => number): ViewStyle {
  return {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(8),
    overflow: 'hidden',
  };
}

function buildCloseButtonStyle(scale: (n: number) => number): ViewStyle {
  return {
    position: 'absolute',
    top: scale(4),
    right: scale(4),
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

export function AttachedMediaThumbnail({ uri, onRemove }: AttachedMediaThumbnailProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const thumbnailStyle = useMemo(() => buildThumbnailStyle(scale), [scale]);
  const closeStyle = useMemo(() => buildCloseButtonStyle(scale), [scale]);

  return (
    <View style={thumbnailStyle}>
      <Image source={{ uri }} style={{ flex: 1 }} resizeMode="cover" />
      <Pressable style={closeStyle} onPress={onRemove} hitSlop={8}>
        <Icon name="close" size={scale(12)} color={theme.colors.onPrimaryAccent} />
      </Pressable>
    </View>
  );
}
