import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadModel, resetModelCache } from './load-model';

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), error: vi.fn() },
}));

const mockLoadPlatform = vi.fn();
vi.mock('./platform/load-model', () => ({
  loadModelPlatform: (...args: unknown[]) => mockLoadPlatform(...args),
}));

describe('loadModel', () => {
  beforeEach(() => {
    resetModelCache();
    mockLoadPlatform.mockReset();
    mockLoadPlatform.mockResolvedValue({ type: 'test-model' });
  });

  it('returns model on first load', async () => {
    const model = await loadModel();
    expect(model).toEqual({ type: 'test-model' });
    expect(mockLoadPlatform).toHaveBeenCalledOnce();
  });

  it('returns cached model on subsequent calls', async () => {
    await loadModel();
    await loadModel();
    expect(mockLoadPlatform).toHaveBeenCalledOnce();
  });

  it('logs load time on first load', async () => {
    const { Logger } = await import('@ion/diagnostics');
    await loadModel();
    expect(Logger.info).toHaveBeenCalledWith(
      'NSFW model loaded',
      expect.objectContaining({ tag: 'nsfw-detection' }),
    );
  });

  it('re-throws on platform load failure', async () => {
    mockLoadPlatform.mockRejectedValue(new Error('load failed'));
    await expect(loadModel()).rejects.toThrow('load failed');
  });
});
