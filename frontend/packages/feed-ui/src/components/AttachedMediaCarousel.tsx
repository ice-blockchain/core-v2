import { useCallback, useMemo } from 'react';
import { FlatList, View } from 'react-native';
import type { ListRenderItem, ViewStyle } from 'react-native';
import { useTheme } from '@ion/ui';
import type { DeviceAsset } from '@ion/feed';
import { AttachedMediaThumbnail } from './AttachedMediaThumbnail';

interface AttachedMediaCarouselProps {
  items: DeviceAsset[];
  onRemove: (index: number) => void;
}

interface CarouselItem {
  uri: string;
  index: number;
}

function buildContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    height: scale(50),
    paddingHorizontal: scale(16),
    marginVertical: scale(8),
  };
}

export function AttachedMediaCarousel({ items, onRemove }: AttachedMediaCarouselProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const containerStyle = useMemo(() => buildContainerStyle(scale), [scale]);
  const gap = useMemo(() => ({ gap: scale(16) }), [scale]);

  const data: CarouselItem[] = useMemo(
    () => items.map((item, index) => ({ uri: item.uri, index })),
    [items],
  );

  const renderItem: ListRenderItem<CarouselItem> = useCallback(({ item }) => (
    <AttachedMediaThumbnail uri={item.uri} onRemove={() => onRemove(item.index)} />
  ), [onRemove]);

  if (items.length === 0) return null;

  return (
    <View style={containerStyle}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={extractKey}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={gap}
      />
    </View>
  );
}

function extractKey(item: CarouselItem): string {
  return `${item.index}-${item.uri}`;
}
