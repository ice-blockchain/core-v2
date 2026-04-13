import type Redis from 'ioredis';
import type { UploadMetadata } from './types.js';

const UPLOAD_KEY_PREFIX = 'cdn:uploads:';
const RECENT_UPLOADS_KEY = 'cdn:recent-uploads';
const RECENT_UPLOADS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const HASH_KEY_TTL_SECONDS = 8 * 24 * 60 * 60; // 8 days — safety net beyond prune window

export default async function storeUploadMetadata(
  redis: Redis,
  metadata: UploadMetadata,
): Promise<void> {
  const key = `${UPLOAD_KEY_PREFIX}${metadata.bucketName}:${metadata.objectName}:${metadata.version}`;
  const cutoff = metadata.uploadedAt - RECENT_UPLOADS_TTL_MS;

  await redis
    .multi()
    .hset(key, flattenMetadata(metadata))
    .expire(key, HASH_KEY_TTL_SECONDS)
    .zadd(RECENT_UPLOADS_KEY, metadata.uploadedAt, key)
    .exec();

  await redis.eval(LUA_PRUNE_EXPIRED, 1, RECENT_UPLOADS_KEY, cutoff);
}

const PRUNE_BATCH_LIMIT = 100;

const LUA_PRUNE_EXPIRED = `
local removed = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, ${PRUNE_BATCH_LIMIT})
if #removed > 0 then
  for i, key in ipairs(removed) do
    redis.call('DEL', key)
  end
  redis.call('ZREM', KEYS[1], unpack(removed))
end
return #removed
`;

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
