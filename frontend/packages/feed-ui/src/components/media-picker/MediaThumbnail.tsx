import { useMemo, useCallback } from 'react';
import { Pressable, View, Image } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { DeviceAsset } from '@ion/feed';
import { useTheme } from '@ion/ui';
import { SelectionBadge } from './SelectionBadge';
import { VideoDurationBadge } from './VideoDurationBadge';

interface MediaThumbnailProps {
  asset: DeviceAsset;
  selectionOrder?: number | undefined;
  isMaxSelected: boolean;
  onPress: (assetId: string) => void;
}

function buildBadgePosition(scale: (n: number) => number): ViewStyle {
  return { position: 'absolute', top: scale(6), right: scale(6) };
}

function buildDurationPosition(scale: (n: number) => number): ViewStyle {
  return { position: 'absolute', bottom: scale(6), right: scale(6) };
}

export function MediaThumbnail({ asset, selectionOrder, isMaxSelected, onPress }: MediaThumbnailProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const handlePress = useCallback(() => onPress(asset.id), [asset.id, onPress]);
  const isSelected = selectionOrder !== undefined;
  const isDimmed = isMaxSelected && !isSelected;
  const badgePos = useMemo(() => buildBadgePosition(scale), [scale]);
  const durationPos = useMemo(() => buildDurationPosition(scale), [scale]);
  const dimStyle = useMemo(() => (isDimmed ? { opacity: 0.5 } : undefined), [isDimmed]);

  return (
    <Pressable style={[{ flex: 1, aspectRatio: 1 }, dimStyle]} onPress={handlePress} disabled={isDimmed}>
      <Image source={{ uri: asset.uri }} style={{ flex: 1 }} resizeMode="cover" />
      <View style={badgePos}><SelectionBadge order={selectionOrder} /></View>
      {asset.mediaType === 'video' && asset.duration ? <View style={durationPos}><VideoDurationBadge durationMs={asset.duration} /></View> : null}
    </Pressable>
  );
}
