import { describe, it, expect, vi } from 'vitest';
import { extractVideoFrames } from './extract-video-frames';

vi.mock('./platform/extract-video-frames', () => ({
  extractVideoFramesPlatform: vi.fn().mockImplementation(
    (uri: string, options?: { frameCount?: number; strategy?: string }) => {
      const count = options?.frameCount ?? 5;
      const durationMs = 10_000;
      const step = durationMs / (count + 1);
      return Promise.resolve(
        Array.from({ length: count }, (_, i) => ({
          uri: `${uri}#frame-${i}`,
          timestampMs: Math.floor(step * (i + 1)),
          index: i,
        })),
      );
    },
  ),
}));

describe('extractVideoFrames', () => {
  it('extracts correct number of frames for uniform strategy', async () => {
    const frames = await extractVideoFrames('test://video.mp4', {
      frameCount: 3,
      strategy: 'uniform',
    });
    expect(frames).toHaveLength(3);
  });

  it('spaces uniform frames evenly', async () => {
    const frames = await extractVideoFrames('test://video.mp4', {
      frameCount: 3,
      strategy: 'uniform',
    });
    const timestamps = frames.map((f) => f.timestampMs);
    expect(timestamps[0]).toBeGreaterThan(0);
    expect(timestamps[1]! - timestamps[0]!).toBeCloseTo(
      timestamps[0]!,
      -2,
    );
  });

  it('returns frames with valid URIs and indices', async () => {
    const frames = await extractVideoFrames('test://video.mp4', {
      frameCount: 3,
    });
    for (const [i, frame] of frames.entries()) {
      expect(frame.uri).toContain('test://video.mp4');
      expect(frame.index).toBe(i);
      expect(frame.timestampMs).toBeGreaterThan(0);
    }
  });

  it('defaults to 5 frames when count not specified', async () => {
    const frames = await extractVideoFrames('test://video.mp4');
    expect(frames).toHaveLength(5);
  });
});
