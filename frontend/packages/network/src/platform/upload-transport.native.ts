import { NetworkError } from '../network-error';
import type { UploadTransport, UploadTransportOptions } from './upload-transport';

export function createUploadTransport(): UploadTransport {
  return { upload: executeUpload };
}

async function executeUpload<T>(options: UploadTransportOptions): Promise<T> {
  const init: RequestInit = { method: 'POST', body: options.formData };
  if (options.headers) init.headers = options.headers;
  if (options.signal) init.signal = options.signal;
  const response = await fetch(options.url, init);

  if (!response.ok) {
    throw new NetworkError({
      code: 'SERVER_ERROR',
      message: `Upload failed with status ${response.status}`,
      status: response.status,
    });
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new NetworkError({
      code: 'PARSE_ERROR',
      message: 'Failed to parse upload response',
    });
  }
}
