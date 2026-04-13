import type Redis from 'ioredis';

const LOCK_PREFIX = 'cdn:item-lock:';
const LOCK_TTL_SECONDS = 1800;
const RENEW_INTERVAL_MS = (LOCK_TTL_SECONDS / 2) * 1000;

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

  const renewTimer = setInterval(() => {
    redis.eval(LUA_RENEW, 1, lockKey, lockValue, LOCK_TTL_SECONDS).catch(() => {});
  }, RENEW_INTERVAL_MS);
  renewTimer.unref();

  return {
    acquired: true,
    release: async () => {
      clearInterval(renewTimer);
      await releaseLock(redis, lockKey, lockValue);
    },
  };
}

function generateLockValue(): string {
  return `${process.pid}:${Date.now()}:${crypto.randomUUID()}`;
}

const LUA_RENEW = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
end
return 0
`;

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
