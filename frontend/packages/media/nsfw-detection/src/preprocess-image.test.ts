import { describe, it, expect, vi } from 'vitest';
import { preprocessImage } from './preprocess-image';

vi.mock('./platform/preprocess-image', () => ({
  preprocessImagePlatform: vi.fn().mockResolvedValue({
    data: new Float32Array(224 * 224 * 3).fill(0.5),
    width: 224,
    height: 224,
    channels: 3,
  }),
}));

describe('preprocessImage', () => {
  it('returns Float32Array with correct length', async () => {
    const result = await preprocessImage('test://image.png');
    expect(result.data).toBeInstanceOf(Float32Array);
    expect(result.data.length).toBe(224 * 224 * 3);
  });

  it('returns dimensions 224x224 with 3 channels', async () => {
    const result = await preprocessImage('test://image.png');
    expect(result.width).toBe(224);
    expect(result.height).toBe(224);
    expect(result.channels).toBe(3);
  });

  it('normalizes pixel values to 0.0-1.0 range', async () => {
    const result = await preprocessImage('test://image.png');
    const allInRange = result.data.every((v) => v >= 0.0 && v <= 1.0);
    expect(allInRange).toBe(true);
  });
});
