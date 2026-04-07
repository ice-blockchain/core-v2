import { useCallback } from 'react';
import { FlatList } from 'react-native';
import type { ListRenderItem } from 'react-native';
import { BottomSheet } from '@ion/ui';
import { translate } from '@ion/localization';
import type { Album } from '@ion/feed';
import { AlbumRow } from './AlbumRow';

interface AlbumPickerSheetProps {
  isVisible: boolean;
  albums: Album[];
  selectedAlbumId: string | null;
  onSelect: (album: Album | null) => void;
  onClose: () => void;
}

function extractKey(item: Album): string {
  return item.id;
}

export function AlbumPickerSheet({ isVisible, albums, selectedAlbumId, onSelect, onClose }: AlbumPickerSheetProps) {
  const renderItem: ListRenderItem<Album> = useCallback(({ item }) => {
    const isSelected = selectedAlbumId === null ? false : item.id === selectedAlbumId;
    return <AlbumRow album={item} isSelected={isSelected} onPress={onSelect} />;
  }, [selectedAlbumId, onSelect]);

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} title={translate('feed:selectAlbumTitle')}>
      <FlatList data={albums} renderItem={renderItem} keyExtractor={extractKey} />
    </BottomSheet>
  );
}
