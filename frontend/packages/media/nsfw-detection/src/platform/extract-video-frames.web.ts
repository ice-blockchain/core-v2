import type { ExtractedFrame, VideoSafetyOptions } from '../types';

export async function extractVideoFramesPlatform(
  uri: string,
  options?: VideoSafetyOptions,
): Promise<ExtractedFrame[]> {
  const count = options?.frameCount ?? 5;
  const strategy = options?.strategy ?? 'uniform';
  const video = await loadVideo(uri);
  const durationMs = video.duration * 1000;
  const timestamps = computeTimestamps(durationMs, count, strategy);
  const frames = await captureFrames(video, timestamps);
  return frames;
}

function loadVideo(uri: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error(`Failed to load video: ${uri}`));
    video.src = uri;
  });
}

function computeTimestamps(
  durationMs: number,
  count: number,
  strategy: string,
): number[] {
  if (strategy === 'random') {
    return Array.from({ length: count }, () =>
      Math.floor(Math.random() * durationMs),
    );
  }
  const step = durationMs / (count + 1);
  return Array.from({ length: count }, (_, i) =>
    Math.floor(step * (i + 1)),
  );
}

async function captureFrames(
  video: HTMLVideoElement,
  timestamps: number[],
): Promise<ExtractedFrame[]> {
  const frames: ExtractedFrame[] = [];
  for (const [i, ts] of timestamps.entries()) {
    const dataUrl = await seekAndCapture(video, ts);
    frames.push({ uri: dataUrl, timestampMs: ts, index: i });
  }
  return frames;
}

function seekAndCapture(
  video: HTMLVideoElement,
  timestampMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    video.currentTime = timestampMs / 1000;
    video.onseeked = () => {
      try {
        resolve(renderFrameToDataUrl(video));
      } catch (error) {
        reject(error);
      }
    };
    video.onerror = () => reject(new Error('Video seek failed'));
  });
}

function renderFrameToDataUrl(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.85);
}
