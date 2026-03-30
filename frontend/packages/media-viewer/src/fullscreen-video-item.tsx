import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { MediaVideo } from './media-video';
import type { MediaViewerSource } from './types';
import { useDismissGesture } from './use-dismiss-gesture';

interface FullscreenVideoItemProps {
  source: MediaViewerSource;
  onClose: () => void;
}

export function FullscreenVideoItem(props: FullscreenVideoItemProps) {
  const { source, onClose } = props;
  const { width, height } = useWindowDimensions();
  const scale = useSharedValue(1);
  const dismiss = useDismissGesture({ onClose, scale });

  return (
    <GestureDetector gesture={dismiss.dismissGesture}>
      <Animated.View style={[styles.container, { width, height }, dismiss.dismissStyle]}>
        <MediaVideo
          source={source}
          autoPlay
          style={{ width, height }}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
