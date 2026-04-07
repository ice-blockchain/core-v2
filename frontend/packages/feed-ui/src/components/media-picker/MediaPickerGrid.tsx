import { useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import type { ListRenderItem } from 'react-native';
import { useTheme } from '@ion/ui';
import type { DeviceAsset } from '@ion/feed';
import { CameraTile } from './CameraTile';
import { MediaThumbnail } from './MediaThumbnail';

const CAMERA_ITEM_ID = '__camera__';

interface GridItem {
  id: string;
  type: 'camera' | 'asset';
  asset?: DeviceAsset;
}

interface MediaPickerGridProps {
  assets: DeviceAsset[];
  selectedItems: Map<string, number>;
  isMaxSelected: boolean;
  onToggleSelection: (assetId: string) => void;
  onCameraPress: () => void;
  onEndReached: () => void;
}

function buildGridData(assets: DeviceAsset[]): GridItem[] {
  const cameraItem: GridItem = { id: CAMERA_ITEM_ID, type: 'camera' };
  return [cameraItem, ...assets.map((asset) => ({ id: asset.id, type: 'asset' as const, asset }))];
}

function extractKey(item: GridItem): string {
  return item.id;
}

function useGridRenderItem({ selectedItems, isMaxSelected, onToggleSelection, onCameraPress }: Pick<MediaPickerGridProps, 'selectedItems' | 'isMaxSelected' | 'onToggleSelection' | 'onCameraPress'>) {
  return useCallback<ListRenderItem<GridItem>>(({ item }) => {
    if (item.type === 'camera') {
      return <CameraTile onPress={onCameraPress} isDisabled={isMaxSelected} />;
    }
    if (!item.asset) return null;
    return (
      <MediaThumbnail asset={item.asset} selectionOrder={selectedItems.get(item.asset.id)} isMaxSelected={isMaxSelected} onPress={onToggleSelection} />
    );
  }, [selectedItems, isMaxSelected, onToggleSelection, onCameraPress]);
}

export function MediaPickerGrid({ assets, selectedItems, isMaxSelected, onToggleSelection, onCameraPress, onEndReached }: MediaPickerGridProps) {
  const theme = useTheme();
  const gap = theme.scale.scaleSize(4);
  const data = useMemo(() => buildGridData(assets), [assets]);
  const columnWrapperStyle = useMemo(() => ({ gap }), [gap]);
  const contentStyle = useMemo(() => ({ gap }), [gap]);
  const renderItem = useGridRenderItem({ selectedItems, isMaxSelected, onToggleSelection, onCameraPress });

  return (
    <FlatList data={data} renderItem={renderItem} keyExtractor={extractKey} numColumns={3} columnWrapperStyle={columnWrapperStyle} contentContainerStyle={contentStyle} onEndReached={onEndReached} onEndReachedThreshold={0.5} />
  );
}
