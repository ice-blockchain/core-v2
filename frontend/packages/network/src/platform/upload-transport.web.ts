import { NetworkError } from '../network-error';
import type { UploadTransport, UploadTransportOptions } from './upload-transport';

export function createUploadTransport(): UploadTransport {
  return { upload: executeUpload };
}

function executeUpload<T>(options: UploadTransportOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', options.url);
    setHeaders(xhr, options.headers);
    attachProgressListener(xhr, options);
    attachResultListeners(xhr, resolve, reject);
    attachAbortSignal(xhr, options.signal);
    xhr.send(options.formData);
  });
}

function setHeaders(
  xhr: XMLHttpRequest,
  headers?: Record<string, string>,
): void {
  if (!headers) return;
  for (const [key, value] of Object.entries(headers)) {
    xhr.setRequestHeader(key, value);
  }
}

function attachProgressListener(
  xhr: XMLHttpRequest,
  options: UploadTransportOptions,
): void {
  if (!options.onProgress) return;
  const onProgress = options.onProgress;
  xhr.upload.addEventListener('progress', (event) => {
    if (!event.lengthComputable) return;
    onProgress({
      bytesSent: event.loaded,
      bytesTotal: event.total,
      percentage: Math.round((event.loaded / event.total) * 100),
    });
  });
}

function attachResultListeners<T>(
  xhr: XMLHttpRequest,
  resolve: (value: T) => void,
  reject: (reason: NetworkError) => void,
): void {
  xhr.addEventListener('load', () => {
    try { resolve(JSON.parse(xhr.responseText) as T); } catch {
      reject(new NetworkError({ code: 'PARSE_ERROR', message: 'Failed to parse upload response', rawBody: xhr.responseText }));
    }
  });
  xhr.addEventListener('error', () => {
    reject(new NetworkError({ code: 'NETWORK_OFFLINE', message: 'Upload failed' }));
  });
  xhr.addEventListener('abort', () => {
    reject(new NetworkError({ code: 'REQUEST_ABORTED', message: 'Upload aborted' }));
  });
}

function attachAbortSignal(
  xhr: XMLHttpRequest,
  signal?: AbortSignal,
): void {
  if (!signal) return;
  signal.addEventListener('abort', () => xhr.abort(), { once: true });
}
