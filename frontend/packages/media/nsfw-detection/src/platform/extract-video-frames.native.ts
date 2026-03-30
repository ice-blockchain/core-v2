import type { ExtractedFrame, VideoSafetyOptions } from '../types';

interface ThumbnailResult {
  path: string;
}

interface ThumbnailConfig {
  url: string;
  timeStamp: number;
  format: 'jpeg' | 'png';
  maxWidth?: number;
  maxHeight?: number;
  timeToleranceMs?: number;
  onlySyncedFrames?: boolean;
}

interface ThumbnailModule {
  createThumbnail(config: ThumbnailConfig): Promise<ThumbnailResult>;
}

function loadThumbnailModule(): ThumbnailModule {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('react-native-create-thumbnail') as ThumbnailModule;
}

const DEFAULT_INTERVAL_MS = 2_000;
const FRAME_MAX_DIMENSION = 1080;
const SEEK_TOLERANCE_MS = 100;

export async function extractVideoFramesPlatform(
  uri: string,
  options?: VideoSafetyOptions,
): Promise<ExtractedFrame[]> {
  const count = options?.frameCount ?? 5;
  const timestamps = computeTimestamps(count, options?.durationMs);
  return captureFramesAtTimestamps(uri, timestamps);
}

function computeTimestamps(count: number, durationMs?: number): number[] {
  if (!durationMs) {
    return Array.from({ length: count }, (_, i) => i * DEFAULT_INTERVAL_MS);
  }
  const step = durationMs / (count + 1);
  return Array.from({ length: count }, (_, i) => Math.floor(step * (i + 1)));
}

function toFilePath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice(7) : uri;
}

async function captureFramesAtTimestamps(
  uri: string,
  timestamps: number[],
): Promise<ExtractedFrame[]> {
  const { createThumbnail } = loadThumbnailModule();
  const filePath = toFilePath(uri);

  const results = await Promise.allSettled(
    timestamps.map((ts, i) =>
      createThumbnail({
        url: filePath,
        timeStamp: ts,
        format: 'jpeg',
        maxWidth: FRAME_MAX_DIMENSION,
        maxHeight: FRAME_MAX_DIMENSION,
        timeToleranceMs: SEEK_TOLERANCE_MS,
        onlySyncedFrames: false,
      }).then((r) => ({ uri: r.path, timestampMs: ts, index: i })),
    ),
  );

  const frames = results
    .filter((r): r is PromiseFulfilledResult<ExtractedFrame> =>
      r.status === 'fulfilled',
    )
    .map((r) => r.value);

  if (frames.length === 0) {
    throw new Error('Failed to extract any frames from video');
  }

  return frames;
}
