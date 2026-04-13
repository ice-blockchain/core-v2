import type Redis from 'ioredis';
import assertSafeEndpoint from './validate-endpoint.js';
import type { ValidatedEndpoint } from './validate-endpoint.js';
import type { GreenfieldQueryClient } from './types.js';

const BUCKET_SP_TTL_SECONDS = 3600;
const BUCKET_SP_PREFIX = 'greenfield-processor:bucket-sp:';

export interface ResolvedStorageProvider {
  endpoint: string;
  validatedEndpoint: ValidatedEndpoint;
}

export default async function resolveStorageProvider(
  bucketName: string,
  greenfieldClient: GreenfieldQueryClient,
  redis: Redis,
  allowedSpHostnamePattern?: string,
): Promise<ResolvedStorageProvider> {
  const cached = await redis.get(`${BUCKET_SP_PREFIX}${bucketName}`);

  if (cached) {
    const validatedEndpoint = await assertSafeEndpoint(
      cached, allowedSpHostnamePattern || undefined,
    );
    return { endpoint: cached, validatedEndpoint };
  }

  const endpoint = await greenfieldClient.sp.getSPUrlByBucket(bucketName);
  const normalized = endpoint.replace(/\/+$/, '');
  const validatedEndpoint = await assertSafeEndpoint(
    normalized, allowedSpHostnamePattern || undefined,
  );

  await redis.set(
    `${BUCKET_SP_PREFIX}${bucketName}`,
    normalized,
    'EX',
    BUCKET_SP_TTL_SECONDS,
  );

  return { endpoint: normalized, validatedEndpoint };
}
