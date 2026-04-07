import { useMemo, useCallback } from 'react';
import { Pressable, View, Image } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '@ion/ui';
import type { DeviceAsset } from '@ion/feed';
import { SelectionBadge } from './SelectionBadge';
import { VideoDurationBadge } from './VideoDurationBadge';

interface MediaThumbnailProps {
  asset: DeviceAsset;
  selectionOrder?: number | undefined;
  isMaxSelected: boolean;
  onPress: (assetId: string) => void;
}

function buildThumbnailStyle(): ViewStyle {
  return { flex: 1, aspectRatio: 1 };
}

function buildBadgeContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    position: 'absolute',
    top: scale(6),
    right: scale(6),
  };
}

function buildDurationContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    position: 'absolute',
    bottom: scale(6),
    right: scale(6),
  };
}

export function MediaThumbnail({ asset, selectionOrder, isMaxSelected, onPress }: MediaThumbnailProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const handlePress = useCallback(() => onPress(asset.id), [asset.id, onPress]);
  const isSelected = selectionOrder !== undefined;
  const isDimmed = isMaxSelected && !isSelected;

  const containerStyle = useMemo(() => buildThumbnailStyle(), []);
  const badgePosition = useMemo(() => buildBadgeContainerStyle(scale), [scale]);
  const durationPosition = useMemo(() => buildDurationContainerStyle(scale), [scale]);
  const dimStyle = useMemo(() => (isDimmed ? { opacity: 0.5 } : undefined), [isDimmed]);

  return (
    <Pressable style={[containerStyle, dimStyle]} onPress={handlePress} disabled={isDimmed}>
      <Image source={{ uri: asset.uri }} style={{ flex: 1 }} resizeMode="cover" />
      <View style={badgePosition}>
        <SelectionBadge order={selectionOrder} />
      </View>
      {asset.mediaType === 'video' && asset.duration ? (
        <View style={durationPosition}>
          <VideoDurationBadge durationMs={asset.duration} />
        </View>
      ) : null}
    </Pressable>
  );
}
