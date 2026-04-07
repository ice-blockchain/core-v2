import { useMemo, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Icon, Text, useTheme } from '@ion/ui';
import type { Album } from '@ion/feed';

interface AlbumRowProps {
  album: Album;
  isSelected: boolean;
  onPress: (album: Album) => void;
}

function buildRowStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    gap: scale(12),
  };
}

function buildTextContainerStyle(): ViewStyle {
  return { flex: 1 };
}

export function AlbumRow({ album, isSelected, onPress }: AlbumRowProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const rowStyle = useMemo(() => buildRowStyle(scale), [scale]);
  const handlePress = useCallback(() => onPress(album), [album, onPress]);

  return (
    <Pressable style={rowStyle} onPress={handlePress}>
      <View style={buildTextContainerStyle()}>
        <Text variant="subtitle">{album.title}</Text>
        <Text variant="body2" color={theme.colors.secondaryText}>{String(album.assetCount)}</Text>
      </View>
      {isSelected ? (
        <Icon name="checkmark" size={scale(24)} color={theme.colors.success} />
      ) : (
        <View style={{ width: scale(24), height: scale(24), borderRadius: scale(12), borderWidth: 1, borderColor: theme.colors.strokeElements }} />
      )}
    </Pressable>
  );
}
