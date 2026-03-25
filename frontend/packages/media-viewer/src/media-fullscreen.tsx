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

function useViewableIndex(initialIndex: number) {
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

  return { currentIndex, viewabilityConfig, handleViewableItemsChanged };
}

function useMediaListCallbacks(onClose: () => void, width: number) {
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

  return { getItemLayout, renderItem };
}

export function MediaFullscreen(props: MediaFullscreenProps) {
  const { sources, initialIndex = 0, onClose } = props;
  const { width } = useWindowDimensions();
  const viewable = useViewableIndex(initialIndex);
  const { getItemLayout, renderItem } = useMediaListCallbacks(onClose, width);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <FullscreenHeader
          currentIndex={viewable.currentIndex}
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
          onViewableItemsChanged={viewable.handleViewableItemsChanged}
          viewabilityConfig={viewable.viewabilityConfig.current}
          showsHorizontalScrollIndicator={false}
          windowSize={3}
        />
      </View>
    </Modal>
  );
}

function keyExtractor(item: MediaViewerSource, index: number) {
  return `${item.uri}-${index}`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
