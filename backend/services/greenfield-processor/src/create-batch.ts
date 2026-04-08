import type Redis from 'ioredis';
import type { PendingUploadItem } from './types.js';

const PENDING_LIST_KEY = 'cdn:pending-uploads';

/**
 * Atomically pushes an item and returns the new list length.
 */
export async function pushAndGetLength(
  redis: Redis,
  item: string,
): Promise<number> {
  return redis.eval(
    LUA_RPUSH_LLEN,
    1,
    PENDING_LIST_KEY,
    item,
  ) as Promise<number>;
}

/**
 * Atomically pops up to `maxSize` items from the pending uploads list.
 */
export default async function createBatch(
  redis: Redis,
  maxSize: number,
): Promise<PendingUploadItem[]> {
  const results = await redis.eval(
    LUA_LPOP_N,
    1,
    PENDING_LIST_KEY,
    maxSize,
  ) as string[];

  if (!results || results.length === 0) return [];

  return results.map((raw) => JSON.parse(raw) as PendingUploadItem);
}

const LUA_RPUSH_LLEN = `
redis.call('RPUSH', KEYS[1], ARGV[1])
return redis.call('LLEN', KEYS[1])
`;

const LUA_LPOP_N = `
local key = KEYS[1]
local count = tonumber(ARGV[1])
local items = {}
for i = 1, count do
  local item = redis.call('LPOP', key)
  if not item then break end
  items[#items + 1] = item
end
return items
`;
