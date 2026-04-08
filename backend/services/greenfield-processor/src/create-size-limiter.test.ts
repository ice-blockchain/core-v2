import { describe, it, expect } from 'vitest';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import createSizeLimiter, { SizeLimitExceededError } from './create-size-limiter.js';

describe('createSizeLimiter', () => {
  it('passes through data under the limit', async () => {
    const chunks: Buffer[] = [];
    const limiter = createSizeLimiter(1024);
    const source = Readable.from([Buffer.alloc(100), Buffer.alloc(100)]);
    const sink = new Writable({
      write(chunk, _enc, cb) { chunks.push(chunk); cb(); },
    });

    await pipeline(source, limiter, sink);
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    expect(total).toBe(200);
  });

  it('throws SizeLimitExceededError when limit exceeded', async () => {
    const limiter = createSizeLimiter(50);
    const source = Readable.from([Buffer.alloc(100)]);
    const sink = new Writable({ write(_c, _e, cb) { cb(); } });

    await expect(pipeline(source, limiter, sink))
      .rejects.toThrow(SizeLimitExceededError);
  });

  it('throws when cumulative chunks exceed limit', async () => {
    const limiter = createSizeLimiter(150);
    const source = Readable.from([Buffer.alloc(100), Buffer.alloc(100)]);
    const sink = new Writable({ write(_c, _e, cb) { cb(); } });

    await expect(pipeline(source, limiter, sink))
      .rejects.toThrow('exceeded size limit');
  });

  it('includes received and limit in error message', async () => {
    const limiter = createSizeLimiter(10);
    const source = Readable.from([Buffer.alloc(20)]);
    const sink = new Writable({ write(_c, _e, cb) { cb(); } });

    await expect(pipeline(source, limiter, sink))
      .rejects.toThrow('limit 10');
  });
});
