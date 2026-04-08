import type Redis from 'ioredis';
import type { UploadMetadata } from './types.js';

const UPLOAD_KEY_PREFIX = 'cdn:uploads:';
const RECENT_UPLOADS_KEY = 'cdn:recent-uploads';
const RECENT_UPLOADS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default async function storeUploadMetadata(
  redis: Redis,
  metadata: UploadMetadata,
): Promise<void> {
  const key = `${UPLOAD_KEY_PREFIX}${metadata.bucketName}:${metadata.objectName}`;

  const cutoff = metadata.uploadedAt - RECENT_UPLOADS_TTL_MS;

  await redis
    .multi()
    .hset(key, flattenMetadata(metadata))
    .zadd(RECENT_UPLOADS_KEY, metadata.uploadedAt, key)
    .zremrangebyscore(RECENT_UPLOADS_KEY, '-inf', cutoff)
    .exec();
}

function flattenMetadata(
  metadata: UploadMetadata,
): Record<string, string | number> {
  return {
    bucketName: metadata.bucketName,
    objectName: metadata.objectName,
    contentType: metadata.contentType,
    size: metadata.size,
    cdnPath: metadata.cdnPath,
    uploadedAt: metadata.uploadedAt,
    txHash: metadata.txHash,
    version: metadata.version,
  };
}
