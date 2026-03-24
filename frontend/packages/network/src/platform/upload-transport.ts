import type { UploadProgress } from '../shared-types';

export interface UploadTransportOptions {
  url: string;
  formData: FormData;
  headers?: Record<string, string> | undefined;
  onProgress?: ((progress: UploadProgress) => void) | undefined;
  signal?: AbortSignal | undefined;
}

export interface UploadTransport {
  upload<T>(options: UploadTransportOptions): Promise<T>;
}

export function createUploadTransport(): UploadTransport {
  throw new Error('Platform implementation not resolved. Use .native.ts or .web.ts');
}
