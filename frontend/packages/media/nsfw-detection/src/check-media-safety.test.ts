import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkMediaSafety } from './check-media-safety';

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), error: vi.fn() },
}));

const mockLoadModel = vi.fn().mockResolvedValue({ type: 'test' });
const mockPreprocess = vi.fn().mockResolvedValue({
  data: new Float32Array(224 * 224 * 3),
  width: 224,
  height: 224,
  channels: 3,
});
const mockRunInference = vi.fn();

vi.mock('./load-model', () => ({
  loadModel: (...args: unknown[]) => mockLoadModel(...args),
}));
vi.mock('./preprocess-image', () => ({
  preprocessImage: (...args: unknown[]) => mockPreprocess(...args),
}));
vi.mock('./run-inference', () => ({
  runInference: (...args: unknown[]) => mockRunInference(...args),
}));

describe('checkMediaSafety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadModel.mockResolvedValue({ type: 'test' });
    mockPreprocess.mockResolvedValue({
      data: new Float32Array(224 * 224 * 3),
      width: 224, height: 224, channels: 3,
    });
    mockRunInference.mockResolvedValue({
      explicit: 0.1, suggestive: 0.1, violence: 0.1, hate: 0.1,
    });
  });

  it('returns safe result for content below all thresholds', async () => {
    mockRunInference.mockResolvedValue({
      explicit: 0.1, suggestive: 0.1, violence: 0.1, hate: 0.1,
    });
    const result = await checkMediaSafety('test://image.png');
    expect(result.isSafe).toBe(true);
  });

  it('returns unsafe result when any category exceeds threshold', async () => {
    mockRunInference.mockResolvedValue({
      explicit: 0.95, suggestive: 0.1, violence: 0.1, hate: 0.1,
    });
    const result = await checkMediaSafety('test://image.png');
    expect(result.isSafe).toBe(false);
  });

  it('throws on empty URI', async () => {
    await expect(checkMediaSafety('')).rejects.toThrow(
      'URI is required for safety check',
    );
  });

  it('re-throws and logs when model loading fails', async () => {
    const { Logger } = await import('@ion/diagnostics');
    mockLoadModel.mockRejectedValue(new Error('model error'));
    await expect(checkMediaSafety('test://img.png')).rejects.toThrow('model error');
    expect(Logger.error).toHaveBeenCalled();
  });

  it('re-throws and logs when preprocessing fails', async () => {
    const { Logger } = await import('@ion/diagnostics');
    mockPreprocess.mockRejectedValue(new Error('preprocess error'));
    await expect(checkMediaSafety('test://img.png')).rejects.toThrow('preprocess error');
    expect(Logger.error).toHaveBeenCalled();
  });

  it('re-throws and logs when inference fails', async () => {
    const { Logger } = await import('@ion/diagnostics');
    mockRunInference.mockRejectedValue(new Error('inference error'));
    await expect(checkMediaSafety('test://img.png')).rejects.toThrow('inference error');
    expect(Logger.error).toHaveBeenCalled();
  });
});
