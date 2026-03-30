import { describe, it, expect, vi } from 'vitest';
import { runInference } from './run-inference';
import type { PreprocessedImage } from './types';

vi.mock('./platform/run-inference', () => ({
  runInferencePlatform: vi.fn().mockResolvedValue({
    explicit: 0.2, suggestive: 0.3, violence: 0.1, hate: 0.05,
  }),
}));

const stubInput: PreprocessedImage = {
  data: new Float32Array(224 * 224 * 3),
  width: 224,
  height: 224,
  channels: 3,
};

describe('runInference', () => {
  it('returns RawInferenceScores with all four category keys', async () => {
    const result = await runInference({}, stubInput);
    expect(result).toHaveProperty('explicit');
    expect(result).toHaveProperty('suggestive');
    expect(result).toHaveProperty('violence');
    expect(result).toHaveProperty('hate');
  });

  it('returns scores in 0-1 range', async () => {
    const result = await runInference({}, stubInput);
    for (const value of Object.values(result)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
