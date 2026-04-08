import { useMemo } from 'react';
import { Pressable, View, Image } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '@ion/ui';
import { SvgXml } from 'react-native-svg';

const CLEAR_ICON_XML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"><circle cx="12" cy="12" r="10" fill="#E1EAF8"/><path stroke="#0E0E0E" stroke-linecap="round" d="m8 8 8 8m0-8-8 8"/></svg>';

const CONTAINER_WIDTH = 44;
const CONTAINER_HEIGHT = 50;
const IMAGE_SIZE = 44;
const IMAGE_BORDER_RADIUS = 10;
const CLOSE_RIGHT_OFFSET = -6;
const ICON_SIZE = 20;

interface AttachedMediaThumbnailProps {
  uri: string;
  onRemove: () => void;
}

function buildContainerStyle(scale: (n: number) => number): ViewStyle {
  return { width: scale(CONTAINER_WIDTH), height: scale(CONTAINER_HEIGHT) };
}

function buildImageStyle(scale: (n: number) => number): ViewStyle {
  return {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(IMAGE_SIZE),
    height: scale(IMAGE_SIZE),
    borderRadius: scale(IMAGE_BORDER_RADIUS),
    overflow: 'hidden',
  };
}

function buildCloseStyle(scale: (n: number) => number): ViewStyle {
  return { position: 'absolute', top: 0, right: scale(CLOSE_RIGHT_OFFSET), zIndex: 1 };
}

export function AttachedMediaThumbnail({ uri, onRemove }: AttachedMediaThumbnailProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const containerStyle = useMemo(() => buildContainerStyle(scale), [scale]);
  const imageStyle = useMemo(() => buildImageStyle(scale), [scale]);
  const closeStyle = useMemo(() => buildCloseStyle(scale), [scale]);
  const iconSize = scale(ICON_SIZE);

  return (
    <View style={containerStyle}>
      <View style={imageStyle}>
        <Image source={{ uri }} style={{ flex: 1 }} resizeMode="cover" />
      </View>
      <Pressable style={closeStyle} onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove attachment">
        <SvgXml xml={CLEAR_ICON_XML} width={iconSize} height={iconSize} />
      </Pressable>
    </View>
  );
}
