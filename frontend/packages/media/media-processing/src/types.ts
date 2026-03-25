export type ImageFormat = "jpeg" | "png" | "webp";

export interface ProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: ImageFormat;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessedMedia {
  uri: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  blurhash: string;
}

export type VideoFormat = "mp4";

export interface VideoProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  bitrate?: number;
  format?: VideoFormat;
}

export type AudioFormat = "opus";

export interface AudioProcessingOptions {
  bitrate?: number;
  sampleRate?: number;
  format?: AudioFormat;
}

export type CompressionAlgorithm = "brotli";

export interface CompressDataOptions {
  algorithm?: CompressionAlgorithm;
  quality?: number;
}

export interface CompressedData {
  data: Uint8Array;
  originalSize: number;
  compressedSize: number;
  algorithm: CompressionAlgorithm;
}
