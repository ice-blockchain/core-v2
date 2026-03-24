import { NetworkError } from './network-error';

interface ParseOptions {
  maxResponseSizeBytes: number;
  abortController?: AbortController;
}

const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

export async function parseResponse<T>(
  response: Response,
  options?: Partial<ParseOptions>,
): Promise<T> {
  if (response.status === 204) return undefined as T;
  const maxSize = options?.maxResponseSizeBytes ?? DEFAULT_MAX_RESPONSE_SIZE;
  const rawBody = await readBodyWithSizeLimit(response, maxSize, options?.abortController);
  const contentType = response.headers.get('content-type') ?? '';
  return parseByContentType<T>(rawBody, contentType);
}

async function readBodyWithSizeLimit(
  response: Response,
  maxSize: number,
  abortController?: AbortController,
): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalBytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxSize) {
        abortController?.abort();
        reader.cancel();
        throw new NetworkError({
          code: 'PARSE_ERROR',
          message: `Response exceeds max size of ${maxSize} bytes`,
        });
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }
  return chunks.join('');
}

function parseByContentType<T>(
  rawBody: string,
  contentType: string,
): T {
  if (contentType.includes('application/json')) {
    return parseJson<T>(rawBody);
  }
  if (contentType.includes('text/html')) {
    throw new NetworkError({
      code: 'PARSE_ERROR',
      message: 'Received HTML response instead of JSON',
      rawBody,
    });
  }
  if (contentType.includes('text/plain')) {
    throw new NetworkError({
      code: 'PARSE_ERROR',
      message: 'Received text/plain response instead of JSON',
      rawBody,
    });
  }
  return parseJson<T>(rawBody);
}

function parseJson<T>(rawBody: string): T {
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new NetworkError({
      code: 'PARSE_ERROR',
      message: 'Failed to parse response as JSON',
      rawBody,
    });
  }
}

export function validateRequestBodySize(
  body: unknown,
  maxSize: number,
): void {
  if (body === undefined || body === null) return;
  const serialized = JSON.stringify(body);
  const byteSize = new TextEncoder().encode(serialized).byteLength;
  if (byteSize > maxSize) {
    throw new NetworkError({
      code: 'CLIENT_ERROR',
      message: `Request body exceeds max size of ${maxSize} bytes (got ${byteSize})`,
    });
  }
}
