import { useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import type { ListRenderItem } from 'react-native';
import { useTheme } from '@ion/ui';
import type { DeviceAsset } from '@ion/feed';
import { CameraTile } from './CameraTile';
import { MediaThumbnail } from './MediaThumbnail';

const CAMERA_ID = '__camera__';

interface GridItem { id: string; type: 'camera' | 'asset'; asset?: DeviceAsset | undefined }

interface MediaPickerGridProps {
  assets: DeviceAsset[];
  selectedItems: Map<string, number>;
  isMaxSelected: boolean;
  onToggleSelection: (assetId: string) => void;
  onCameraPress: () => void;
  onEndReached: () => void;
}

function buildGridData(assets: DeviceAsset[]): GridItem[] {
  return [{ id: CAMERA_ID, type: 'camera' }, ...assets.map((a) => ({ id: a.id, type: 'asset' as const, asset: a }))];
}

function extractKey(item: GridItem): string { return item.id; }

export function MediaPickerGrid({ assets, selectedItems, isMaxSelected, onToggleSelection, onCameraPress, onEndReached }: MediaPickerGridProps) {
  const theme = useTheme();
  const gap = theme.scale.scaleSize(4);
  const data = useMemo(() => buildGridData(assets), [assets]);
  const gapStyle = useMemo(() => ({ gap }), [gap]);

  const renderItem: ListRenderItem<GridItem> = useCallback(({ item }) => {
    if (item.type === 'camera') return <CameraTile onPress={onCameraPress} isDisabled={isMaxSelected} />;
    if (!item.asset) return null;
    return <MediaThumbnail asset={item.asset} selectionOrder={selectedItems.get(item.asset.id)} isMaxSelected={isMaxSelected} onPress={onToggleSelection} />;
  }, [selectedItems, isMaxSelected, onToggleSelection, onCameraPress]);

  return <FlatList data={data} renderItem={renderItem} keyExtractor={extractKey} numColumns={3} columnWrapperStyle={gapStyle} contentContainerStyle={gapStyle} onEndReached={onEndReached} onEndReachedThreshold={0.5} />;
}
