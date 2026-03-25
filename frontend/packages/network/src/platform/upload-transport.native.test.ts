import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkError } from '../network-error';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { createUploadTransport } from './upload-transport.native';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json' },
  });
}

describe('NativeUploadTransport success', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('uploads and returns parsed JSON', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ uploaded: true }));
    const transport = createUploadTransport();
    const result = await transport.upload<{ uploaded: boolean }>({
      url: 'https://api.example.com/upload',
      formData: new FormData(),
    });
    expect(result).toEqual({ uploaded: true });
  });

  it('passes headers and signal to fetch', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
    const transport = createUploadTransport();
    const controller = new AbortController();
    await transport.upload({
      url: 'https://api.example.com/upload',
      formData: new FormData(),
      headers: { 'X-Custom': 'value' },
      signal: controller.signal,
    });
    const callInit = mockFetch.mock.calls[0]![1] as RequestInit;
    expect(callInit.headers).toEqual({ 'X-Custom': 'value' });
    expect(callInit.signal).toBe(controller.signal);
  });
});

describe('NativeUploadTransport errors', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('throws SERVER_ERROR when response status >= 400', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'fail' }, 500));
    const transport = createUploadTransport();
    await expect(
      transport.upload({ url: 'https://api.example.com/upload', formData: new FormData() }),
    ).rejects.toThrow('Upload failed with status 500');
  });

  it('throws PARSE_ERROR when response is not valid JSON', async () => {
    mockFetch.mockResolvedValue(
      new Response('not json', { status: 200, headers: { 'content-type': 'text/plain' } }),
    );
    const transport = createUploadTransport();
    await expect(
      transport.upload({ url: 'https://api.example.com/upload', formData: new FormData() }),
    ).rejects.toThrow('Failed to parse upload response');
  });
});
