import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { Image } from 'react-native';
import type { MediaViewerSource } from './types';
import { usePinchToZoom } from './use-pinch-to-zoom';
import { useDismissGesture } from './use-dismiss-gesture';

interface FullscreenImageItemProps {
  source: MediaViewerSource;
  onClose: () => void;
  onZoomChange?: (isZoomed: boolean) => void;
}

export function FullscreenImageItem(props: FullscreenImageItemProps) {
  const { source, onClose } = props;
  const { width, height } = useWindowDimensions();
  const pinch = usePinchToZoom();
  const dismiss = useDismissGesture({ onClose, scale: pinch.scale });

  const composedGesture = Gesture.Exclusive(
    dismiss.dismissGesture,
    Gesture.Simultaneous(pinch.pinchGesture, pinch.panGesture),
    pinch.doubleTapGesture,
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, { width, height }, dismiss.dismissStyle]}>
        <Animated.View style={[styles.imageWrapper, pinch.animatedStyle]}>
          <Image
            source={{ uri: source.uri }}
            style={{ width, height }}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
