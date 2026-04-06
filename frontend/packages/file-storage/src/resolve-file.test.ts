import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveFile } from './resolve-file';
import type { HttpClient } from '@ion/network';

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn().mockResolvedValue({ body: { fileId: 'f1', cdnUrl: 'https://cdn/f1', tonBagId: null, tonFileIndex: null, fileSize: 1024, mimeType: 'image/png' }, status: 200, headers: {} }),
    head: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn(),
  } as unknown as HttpClient;
}

beforeEach(() => vi.clearAllMocks());

describe('resolveFile', () => {
  it('calls GET with correct URL and returns resolution', async () => {
    const http = createMockHttpClient();
    const result = await resolveFile(http, 'https://api.ion.app', 'file-123');
    expect(http.get).toHaveBeenCalledWith('https://api.ion.app/files/file-123/resolve');
    expect(result.fileId).toBe('f1');
    expect(result.cdnUrl).toBe('https://cdn/f1');
  });

  it('encodes file ID in URL', async () => {
    const http = createMockHttpClient();
    await resolveFile(http, 'https://api.ion.app', 'file with spaces');
    expect(http.get).toHaveBeenCalledWith('https://api.ion.app/files/file%20with%20spaces/resolve');
  });
});
