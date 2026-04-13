import type Redis from 'ioredis';
import fetchWithPinnedDns from './fetch-with-pinned-dns.js';
import type { ValidatedEndpoint } from './validate-endpoint.js';

const CONTENT_TYPE_PREFIX = 'cdn:content-type:';
const CONTENT_TYPE_TTL_SECONDS = 3600;

const EXTENSION_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.br': 'application/x-brotli',
};

export interface ResolveContentTypeDeps {
  bucketName: string;
  objectName: string;
  spEndpoint: string;
  redis: Redis;
  validatedEndpoint: ValidatedEndpoint;
}

export default async function resolveContentType(
  deps: ResolveContentTypeDeps,
): Promise<string> {
  const { bucketName, objectName, spEndpoint, redis, validatedEndpoint } = deps;
  const cacheKey = `${CONTENT_TYPE_PREFIX}${bucketName}:${objectName}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const contentType = await fetchContentTypeFromSp(
    bucketName, objectName, spEndpoint, validatedEndpoint,
  );

  if (contentType) {
    await redis.set(cacheKey, contentType, 'EX', CONTENT_TYPE_TTL_SECONDS);
    return contentType;
  }

  return guessFromExtension(objectName);
}

async function fetchContentTypeFromSp(
  bucketName: string,
  objectName: string,
  spEndpoint: string,
  validatedEndpoint: ValidatedEndpoint,
): Promise<string | null> {
  const url = `${spEndpoint}/${encodeURIComponent(objectName)}`;
  try {
    const { response, cleanup } = await fetchWithPinnedDns({
      url,
      init: {
        method: 'HEAD',
        headers: { Host: `${bucketName}.${extractHost(spEndpoint)}` },
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      },
      validatedEndpoint,
    });
    await cleanup();
    if (!response.ok) return null;
    return response.headers.get('content-type') ?? null;
  } catch {
    return null;
  }
}

function extractHost(endpoint: string): string {
  return new URL(endpoint).host;
}

function guessFromExtension(objectName: string): string {
  const dotIndex = objectName.lastIndexOf('.');
  if (dotIndex === -1) return 'application/octet-stream';
  const ext = objectName.slice(dotIndex).toLowerCase();
  return EXTENSION_MAP[ext] ?? 'application/octet-stream';
}
