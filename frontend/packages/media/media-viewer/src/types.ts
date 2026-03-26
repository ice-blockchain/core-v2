import type { ImageStyle, ViewStyle } from 'react-native';

// --- Public ---

export interface MediaViewerSource {
  uri: string;
  mimeType: string;
  blurhash?: string;
  width?: number;
  height?: number;
  thumbnailUri?: string;
}

export interface MediaImageProps {
  source: MediaViewerSource;
  style?: ImageStyle;
  resizeMode?: 'cover' | 'contain' | 'fill';
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export interface MediaVideoProps {
  source: MediaViewerSource;
  autoPlay?: boolean;
  muted?: boolean;
  isLooping?: boolean;
  style?: ViewStyle;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export interface MediaFullscreenProps {
  sources: MediaViewerSource[];
  initialIndex?: number;
  onClose: () => void;
}

// --- Internal ---

export type MediaType = 'image' | 'video' | 'unknown';

export interface AspectRatioResult {
  width: number;
  height: number;
  aspectRatio: number;
}
