import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkVideoSafety } from './check-video-safety';

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), error: vi.fn() },
}));

const mockLoadModel = vi.fn().mockResolvedValue({ type: 'test' });
const mockPreprocess = vi.fn().mockResolvedValue({
  data: new Float32Array(224 * 224 * 3),
  width: 224, height: 224, channels: 3,
});
const mockRunInference = vi.fn();
const mockExtractFrames = vi.fn();

vi.mock('./load-model', () => ({
  loadModel: (...args: unknown[]) => mockLoadModel(...args),
}));
vi.mock('./preprocess-image', () => ({
  preprocessImage: (...args: unknown[]) => mockPreprocess(...args),
}));
vi.mock('./run-inference', () => ({
  runInference: (...args: unknown[]) => mockRunInference(...args),
}));
vi.mock('./extract-video-frames', () => ({
  extractVideoFrames: (...args: unknown[]) => mockExtractFrames(...args),
}));

function makeFrames(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    uri: `frame-${i}`, timestampMs: i * 1000, index: i,
  }));
}

const safeScores = { explicit: 0.1, suggestive: 0.1, violence: 0.1, hate: 0.1 };
const unsafeScores = { explicit: 0.95, suggestive: 0.1, violence: 0.1, hate: 0.1 };

describe('checkVideoSafety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadModel.mockResolvedValue({ type: 'test' });
    mockExtractFrames.mockResolvedValue(makeFrames(5));
    mockRunInference.mockResolvedValue(safeScores);
  });

  it('returns safe result when all frames below thresholds', async () => {
    const result = await checkVideoSafety('test://video.mp4');
    expect(result.isSafe).toBe(true);
    expect(result.framesAnalyzed).toBe(5);
  });

  it('returns unsafe when majority of frames exceed threshold', async () => {
    mockRunInference
      .mockResolvedValueOnce(unsafeScores)
      .mockResolvedValueOnce(unsafeScores)
      .mockResolvedValueOnce(unsafeScores)
      .mockResolvedValue(safeScores);
    const result = await checkVideoSafety('test://video.mp4', {
      earlyExit: false,
    });
    expect(result.isSafe).toBe(false);
  });

  it('returns unsafe when any frame exceeds threshold', async () => {
    mockRunInference
      .mockResolvedValueOnce(safeScores)
      .mockResolvedValueOnce(unsafeScores)
      .mockResolvedValue(safeScores);
    const result = await checkVideoSafety('test://video.mp4', {
      earlyExit: false,
    });
    expect(result.isSafe).toBe(false);
  });

  it('early-exits after first flagged frame by default', async () => {
    mockRunInference.mockResolvedValueOnce(unsafeScores);
    const result = await checkVideoSafety('test://video.mp4');
    expect(result.framesAnalyzed).toBe(1);
    expect(result.flaggedFrameIndices).toEqual([0]);
  });

  it('analyzes all frames when earlyExit is false', async () => {
    mockRunInference
      .mockResolvedValueOnce(unsafeScores)
      .mockResolvedValue(safeScores);
    const result = await checkVideoSafety('test://video.mp4', {
      earlyExit: false,
    });
    expect(result.framesAnalyzed).toBe(5);
  });

  it('returns flaggedFrameIndices for unsafe frames only', async () => {
    mockRunInference
      .mockResolvedValueOnce(safeScores)
      .mockResolvedValueOnce(unsafeScores)
      .mockResolvedValue(safeScores);
    const result = await checkVideoSafety('test://video.mp4');
    expect(result.flaggedFrameIndices).toEqual([1]);
  });

  it('defaults to 5 frames and uniform strategy', async () => {
    await checkVideoSafety('test://video.mp4');
    expect(mockExtractFrames).toHaveBeenCalledWith(
      'test://video.mp4',
      undefined,
    );
  });

  it('throws on empty URI', async () => {
    await expect(checkVideoSafety('')).rejects.toThrow(
      'URI is required for safety check',
    );
  });

  it('re-throws and logs on frame extraction failure', async () => {
    const { Logger } = await import('@ion/diagnostics');
    mockExtractFrames.mockRejectedValue(new Error('frame error'));
    await expect(checkVideoSafety('test://v.mp4')).rejects.toThrow('frame error');
    expect(Logger.error).toHaveBeenCalled();
  });
});
