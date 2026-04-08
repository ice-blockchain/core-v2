import { useMemo } from 'react';
import { Pressable, View, Image } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '@ion/ui';
import { SvgXml } from 'react-native-svg';

const CLEAR_ICON_XML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"><circle cx="12" cy="12" r="10" fill="#E1EAF8"/><path stroke="#0E0E0E" stroke-linecap="round" d="m8 8 8 8m0-8-8 8"/></svg>';

interface AttachedMediaThumbnailProps {
  uri: string;
  onRemove: () => void;
}

function buildContainerStyle(scale: (n: number) => number): ViewStyle {
  return { width: scale(44), height: scale(50) };
}

function buildImageStyle(scale: (n: number) => number): ViewStyle {
  return {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(44),
    height: scale(44),
    borderRadius: scale(10),
    overflow: 'hidden',
  };
}

function buildCloseStyle(scale: (n: number) => number): ViewStyle {
  return {
    position: 'absolute',
    top: 0,
    right: scale(-6),
    zIndex: 1,
  };
}

export function AttachedMediaThumbnail({ uri, onRemove }: AttachedMediaThumbnailProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const containerStyle = useMemo(() => buildContainerStyle(scale), [scale]);
  const imageStyle = useMemo(() => buildImageStyle(scale), [scale]);
  const closeStyle = useMemo(() => buildCloseStyle(scale), [scale]);
  const iconSize = scale(20);

  return (
    <View style={containerStyle}>
      <View style={imageStyle}>
        <Image source={{ uri }} style={{ flex: 1 }} resizeMode="cover" />
      </View>
      <Pressable style={closeStyle} onPress={onRemove} hitSlop={8}>
        <SvgXml xml={CLEAR_ICON_XML} width={iconSize} height={iconSize} />
      </Pressable>
    </View>
  );
}
