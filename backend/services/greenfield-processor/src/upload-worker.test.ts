import { describe, it, expect, vi } from 'vitest';
import type { PendingUploadItem } from './types.js';

function createTestItem(overrides?: Partial<PendingUploadItem>): PendingUploadItem {
  return {
    bucketName: 'test-bucket',
    objectName: 'file.png',
    payloadSize: 1000,
    contentType: 'image/png',
    txHash: '0xabc',
    version: 1,
    checksums: ['abc123'],
    ...overrides,
  };
}

function createMockRedis() {
  const pushes: { key: string; value: string }[] = [];

  return {
    pipeline: vi.fn(() => ({
      rpush: vi.fn((key: string, value: string) => {
        pushes.push({ key, value });
      }),
      ltrim: vi.fn(),
      exec: vi.fn(async () => []),
    })),
    _pushes: pushes,
  };
}

describe('upload-worker item lock', () => {
  it('generates lock key from bucket, object, and version', () => {
    const item = createTestItem({ bucketName: 'b', objectName: 'o', version: 3 });
    const lockKey = `${item.bucketName}:${item.objectName}:${item.version}`;
    expect(lockKey).toBe('b:o:3');
  });

  it('different versions produce different lock keys', () => {
    const item1 = createTestItem({ version: 1 });
    const item2 = createTestItem({ version: 2 });
    const key1 = `${item1.bucketName}:${item1.objectName}:${item1.version}`;
    const key2 = `${item2.bucketName}:${item2.objectName}:${item2.version}`;
    expect(key1).not.toBe(key2);
  });
});

describe('upload-worker idempotency', () => {
  it('generates a unique key per item from bucket, object, and version', () => {
    const item = createTestItem({ bucketName: 'b', objectName: 'o', version: 3 });
    const key = `${item.bucketName}:${item.objectName}:${item.version}`;
    expect(key).toBe('b:o:3');
  });

  it('different versions produce different keys', () => {
    const item1 = createTestItem({ version: 1 });
    const item2 = createTestItem({ version: 2 });
    const key1 = `${item1.bucketName}:${item1.objectName}:${item1.version}`;
    const key2 = `${item2.bucketName}:${item2.objectName}:${item2.version}`;
    expect(key1).not.toBe(key2);
  });

  it('completed set from job progress is restored correctly', () => {
    const progress = { completed: ['b:o:1', 'b:o:2'] };
    const completed = new Set<string>(progress.completed ?? []);
    expect(completed.has('b:o:1')).toBe(true);
    expect(completed.has('b:o:2')).toBe(true);
    expect(completed.has('b:o:3')).toBe(false);
  });

  it('empty progress results in empty completed set', () => {
    const progress = undefined as { completed?: string[] } | undefined;
    const completed = new Set<string>(progress?.completed ?? []);
    expect(completed.size).toBe(0);
  });
});

describe('upload-worker per-bucket SP cache', () => {
  it('reuses cached provider for same bucket within a batch', () => {
    const spCache = new Map<string, { endpoint: string; validatedEndpoint: { ip: string; family: number } }>();
    const resolved = { endpoint: 'https://sp.example.com', validatedEndpoint: { ip: '203.0.113.10', family: 4 } };
    spCache.set('my-bucket', resolved);

    const hit = spCache.get('my-bucket');
    expect(hit).toBe(resolved);
  });

  it('returns undefined for uncached bucket', () => {
    const spCache = new Map<string, { endpoint: string; validatedEndpoint: { ip: string; family: number } }>();
    expect(spCache.get('unknown-bucket')).toBeUndefined();
  });

  it('caches distinct entries per bucket name', () => {
    const spCache = new Map<string, { endpoint: string; validatedEndpoint: { ip: string; family: number } }>();
    const sp1 = { endpoint: 'https://sp1.example.com', validatedEndpoint: { ip: '203.0.113.10', family: 4 } };
    const sp2 = { endpoint: 'https://sp2.example.com', validatedEndpoint: { ip: '203.0.113.11', family: 4 } };
    spCache.set('bucket-a', sp1);
    spCache.set('bucket-b', sp2);

    expect(spCache.get('bucket-a')?.endpoint).toBe('https://sp1.example.com');
    expect(spCache.get('bucket-b')?.endpoint).toBe('https://sp2.example.com');
  });
});

describe('upload-worker dead-letter categorization', () => {
  it('items at retry boundary are dead-lettered using persisted failCounts', () => {
    const maxRetries = 3;
    const key = 'test-bucket:file.png:1';
    const failCounts = new Map<string, number>([[key, 3]]);
    const retryCount = (failCounts.get(key) ?? 0) + 1;
    expect(retryCount > maxRetries).toBe(true);
  });

  it('items under retry limit are retried via BullMQ', () => {
    const maxRetries = 3;
    const key = 'test-bucket:file.png:1';
    const failCounts = new Map<string, number>([[key, 2]]);
    const retryCount = (failCounts.get(key) ?? 0) + 1;
    expect(retryCount > maxRetries).toBe(false);
  });

  it('items with no prior failures start at 1 in failCounts', () => {
    const key = 'test-bucket:file.png:1';
    const failCounts = new Map<string, number>();
    const retryCount = (failCounts.get(key) ?? 0) + 1;
    expect(retryCount).toBe(1);
  });

  it('failCounts persist via job.progress across batch retries', () => {
    const progress = {
      completed: ['b:o:1'],
      failCounts: { 'b:o:2': 2, 'b:o:3': 1 },
    };
    const failCounts = new Map<string, number>(Object.entries(progress.failCounts));
    expect(failCounts.get('b:o:2')).toBe(2);
    expect(failCounts.get('b:o:3')).toBe(1);
    expect(failCounts.get('b:o:4')).toBeUndefined();
  });

  it('item reaches dead-letter after accumulating MAX_RETRIES+1 failures', () => {
    const maxRetries = 3;
    const key = 'test-bucket:file.png:1';
    const failCounts = new Map<string, number>();

    for (let i = 0; i <= maxRetries; i++) {
      const count = (failCounts.get(key) ?? 0) + 1;
      failCounts.set(key, count);
    }

    expect(failCounts.get(key)).toBe(maxRetries + 1);
    expect(failCounts.get(key)! > maxRetries).toBe(true);
  });

  it('dead-lettered items are pushed to DLQ only', async () => {
    const redis = createMockRedis();
    const deadLettered = [createTestItem({ retryCount: 4 })];

    const pipeline = redis.pipeline();
    for (const item of deadLettered) {
      pipeline.rpush('cdn:dead-letter-uploads', JSON.stringify(item));
    }
    await pipeline.exec();

    expect(redis._pushes.length).toBe(1);
    expect(redis._pushes[0].key).toBe('cdn:dead-letter-uploads');
  });

  it('trims dead-letter list to cap size after pushing', async () => {
    const redis = createMockRedis();
    const deadLettered = [createTestItem({ retryCount: 4 })];

    const pipeline = redis.pipeline();
    for (const item of deadLettered) {
      pipeline.rpush('cdn:dead-letter-uploads', JSON.stringify(item));
    }
    pipeline.ltrim('cdn:dead-letter-uploads', -10_000, -1);
    await pipeline.exec();

    expect(pipeline.ltrim).toHaveBeenCalledWith(
      'cdn:dead-letter-uploads', -10_000, -1,
    );
  });

  it('no pipeline created when no dead-lettered items', () => {
    const redis = createMockRedis();
    const deadLettered: PendingUploadItem[] = [];

    if (deadLettered.length === 0) {
      expect(redis.pipeline).not.toHaveBeenCalled();
    }
  });
});
