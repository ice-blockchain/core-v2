import type Redis from 'ioredis';

const LOCK_PREFIX = 'cdn:item-lock:';
const LOCK_TTL_SECONDS = 1800;

export interface ItemLockResult {
  acquired: boolean;
  release: () => Promise<void>;
}

export default async function acquireItemLock(
  redis: Redis,
  itemKey: string,
): Promise<ItemLockResult> {
  const lockKey = `${LOCK_PREFIX}${itemKey}`;
  const lockValue = generateLockValue();
  const result = await redis.set(lockKey, lockValue, 'EX', LOCK_TTL_SECONDS, 'NX');

  if (result !== 'OK') {
    return { acquired: false, release: async () => {} };
  }

  return {
    acquired: true,
    release: () => releaseLock(redis, lockKey, lockValue),
  };
}

function generateLockValue(): string {
  return `${process.pid}:${Date.now()}:${crypto.randomUUID()}`;
}

const LUA_RELEASE = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

async function releaseLock(
  redis: Redis,
  key: string,
  value: string,
): Promise<void> {
  await redis.eval(LUA_RELEASE, 1, key, value);
}
