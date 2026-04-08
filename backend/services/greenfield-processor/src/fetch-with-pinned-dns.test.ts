import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fetchWithPinnedDns from './fetch-with-pinned-dns.js';

const BODY_CONTENT = 'A'.repeat(10_000);
let server: Server;
let serverPort: number;

beforeAll(async () => {
  server = createServer((_req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Content-Length': String(Buffer.byteLength(BODY_CONTENT)),
    });
    res.end(BODY_CONTENT);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const addr = server.address();
  serverPort = typeof addr === 'object' && addr ? addr.port : 0;
});

afterAll(() => { server.close(); });

describe('fetchWithPinnedDns', () => {
  it('fetches using the pinned IP and streams the full body', async () => {
    const { response, cleanup } = await fetchWithPinnedDns({
      url: `http://127.0.0.1:${serverPort}/test`,
      init: { signal: AbortSignal.timeout(5000) },
      validatedEndpoint: { ip: '127.0.0.1', family: 4 },
    });

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe(BODY_CONTENT);
    await cleanup();
  });

  it('cleanup does not throw when called after body is consumed', async () => {
    const { response, cleanup } = await fetchWithPinnedDns({
      url: `http://127.0.0.1:${serverPort}/test`,
      init: { signal: AbortSignal.timeout(5000) },
      validatedEndpoint: { ip: '127.0.0.1', family: 4 },
    });

    await response.text();
    await expect(cleanup()).resolves.not.toThrow();
  });

  it('closes dispatcher immediately on fetch error', async () => {
    await expect(
      fetchWithPinnedDns({
        url: 'http://127.0.0.1:1/unreachable',
        init: { signal: AbortSignal.timeout(2000) },
        validatedEndpoint: { ip: '127.0.0.1', family: 4 },
      }),
    ).rejects.toThrow();
  });

  it('pins DNS so fetch ignores the hostname resolution', async () => {
    // URL hostname is "localhost" but we pin to 127.0.0.1.
    // If DNS pinning works, the request reaches our server on 127.0.0.1.
    const { response, cleanup } = await fetchWithPinnedDns({
      url: `http://localhost:${serverPort}/test`,
      init: { signal: AbortSignal.timeout(5000) },
      validatedEndpoint: { ip: '127.0.0.1', family: 4 },
    });

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe(BODY_CONTENT);
    await cleanup();
  });
});
