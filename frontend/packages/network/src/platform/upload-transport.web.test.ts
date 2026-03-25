// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

let uploadListeners: Record<string, EventListener>;
let xhrListeners: Record<string, EventListener>;
let mockXhr: Record<string, unknown>;

vi.stubGlobal('XMLHttpRequest', vi.fn(() => {
  uploadListeners = {};
  xhrListeners = {};
  mockXhr = {
    open: vi.fn(),
    send: vi.fn(),
    setRequestHeader: vi.fn(),
    abort: vi.fn(),
    upload: {
      addEventListener: vi.fn((event: string, listener: EventListener) => {
        uploadListeners[event] = listener;
      }),
    },
    addEventListener: vi.fn((event: string, listener: EventListener) => {
      xhrListeners[event] = listener;
    }),
    status: 200,
    responseText: '{"ok":true}',
  };
  return mockXhr;
}));

import { createUploadTransport } from './upload-transport.web';

describe('WebUploadTransport success', () => {
  it('uploads and parses JSON response', async () => {
    const transport = createUploadTransport();
    const formData = new FormData();
    const promise = transport.upload<{ ok: boolean }>({
      url: 'https://api.example.com/upload',
      formData,
    });
    xhrListeners['load']!(new Event('load'));
    const result = await promise;
    expect(result).toEqual({ ok: true });
  });
});

describe('WebUploadTransport progress', () => {
  it('calls onProgress callback', async () => {
    const transport = createUploadTransport();
    const onProgress = vi.fn();
    const promise = transport.upload({
      url: 'https://api.example.com/upload',
      formData: new FormData(),
      onProgress,
    });
    const progressEvent = { lengthComputable: true, loaded: 50, total: 100 };
    uploadListeners['progress']!(progressEvent as unknown as Event);
    xhrListeners['load']!(new Event('load'));
    await promise;
    expect(onProgress).toHaveBeenCalledWith({
      bytesSent: 50,
      bytesTotal: 100,
      percentage: 50,
    });
  });
});

describe('WebUploadTransport errors', () => {
  it('rejects on network error', async () => {
    const transport = createUploadTransport();
    const promise = transport.upload({
      url: 'https://api.example.com/upload',
      formData: new FormData(),
    });
    xhrListeners['error']!(new Event('error'));
    await expect(promise).rejects.toThrow('Upload failed');
  });

  it('rejects on abort', async () => {
    const transport = createUploadTransport();
    const promise = transport.upload({
      url: 'https://api.example.com/upload',
      formData: new FormData(),
    });
    xhrListeners['abort']!(new Event('abort'));
    await expect(promise).rejects.toThrow('Upload aborted');
  });

});

describe('WebUploadTransport HTTP status errors', () => {
  it('rejects with SERVER_ERROR when upload returns 500', async () => {
    const transport = createUploadTransport();
    const promise = transport.upload({
      url: 'https://api.example.com/upload',
      formData: new FormData(),
    });
    mockXhr.status = 500;
    xhrListeners['load']!(new Event('load'));
    await expect(promise).rejects.toThrow('Upload failed with status 500');
  });

  it('rejects with CLIENT_ERROR when upload returns 400', async () => {
    const transport = createUploadTransport();
    const promise = transport.upload({
      url: 'https://api.example.com/upload',
      formData: new FormData(),
    });
    mockXhr.status = 400;
    xhrListeners['load']!(new Event('load'));
    await expect(promise).rejects.toThrow('Upload failed with status 400');
  });
});
