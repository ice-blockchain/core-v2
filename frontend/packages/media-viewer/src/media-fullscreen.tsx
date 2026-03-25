import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ViewToken } from 'react-native';
import type { MediaFullscreenProps, MediaViewerSource } from './types';
import { FullscreenHeader } from './fullscreen-header';
import { FullscreenImageItem } from './fullscreen-image-item';
import { FullscreenVideoItem } from './fullscreen-video-item';

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function renderMediaItem(
  source: MediaViewerSource,
  onClose: () => void,
) {
  if (isImageMimeType(source.mimeType)) {
    return <FullscreenImageItem source={source} onClose={onClose} />;
  }
  return <FullscreenVideoItem source={source} onClose={onClose} />;
}

export function MediaFullscreen(props: MediaFullscreenProps) {
  const { sources, initialIndex = 0, onClose } = props;
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  const handleViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken[] }) => {
      const firstVisible = info.viewableItems[0];
      if (firstVisible?.index != null) {
        setCurrentIndex(firstVisible.index);
      }
    },
    [],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const renderItem = useCallback(
    ({ item }: { item: MediaViewerSource }) => renderMediaItem(item, onClose),
    [onClose],
  );

  const keyExtractor = useCallback(
    (item: MediaViewerSource, index: number) => `${item.uri}-${index}`,
    [],
  );

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <FullscreenHeader
          currentIndex={currentIndex}
          totalCount={sources.length}
          onClose={onClose}
        />
        <FlatList
          data={sources}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          getItemLayout={getItemLayout}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          showsHorizontalScrollIndicator={false}
          windowSize={3}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
