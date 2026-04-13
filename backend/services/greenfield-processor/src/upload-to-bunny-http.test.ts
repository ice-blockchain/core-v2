import { createServer } from 'node:http';
import type { Server, IncomingMessage } from 'node:http';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import uploadToBunnyHttp from './upload-to-bunny-http.js';
import type { CdnUploaderConfig } from './types.js';

const TEST_DIR = '/tmp/greenfield-processor-http-test';
const TEST_CONTENT = Buffer.from('B'.repeat(2000));

let server: Server;
let serverPort: number;
let lastRequest: { headers: IncomingMessage['headers']; body: Buffer } | null;
let serverStatusCode = 201;

function createTestConfig(port: number): CdnUploaderConfig {
  return {
    redisUrl: 'redis://localhost:6379',
    greenfieldRpcUrl: 'https://rpc.example.com',
    greenfieldChainId: 'test-chain',
    bunnyStorageZone: 'test-zone',
    bunnyStoragePassword: 'test-key-123',
    bunnyStorageRegion: 'ny',
    bunnyFtpHost: 'ftp.example.com',
    ftpSecure: true,
    ftpMaxConnections: 2,
    httpUploadSizeLimit: 50 * 1024 * 1024,
    maxDownloadSize: 500 * 1024 * 1024,
    batchMaxSize: 20,
    batchFlushIntervalMs: 10_000,
    uploadConcurrency: 5,
    port,
    logLevel: 'info',
    sourceQueueName: 'test-queue',
    tempDir: '/tmp/test',
    allowedSpHostnamePattern: '',
    maxSegmentSize: 16 * 1024 * 1024,
  };
}

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    lastRequest = { headers: req.headers, body: Buffer.concat(chunks) };
    res.writeHead(serverStatusCode);
    res.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const addr = server.address();
  serverPort = typeof addr === 'object' && addr ? addr.port : 0;
});

afterAll(async () => {
  server.close();
  await rm(TEST_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  lastRequest = null;
  serverStatusCode = 201;
  await mkdir(TEST_DIR, { recursive: true });
});

describe('uploadToBunnyHttp', () => {
  it('streams file content to the server', async () => {
    const filePath = join(TEST_DIR, 'stream-test.bin');
    await writeFile(filePath, TEST_CONTENT);

    const config = createTestConfig(serverPort);
    config.bunnyStorageRegion = 'la';

    // Override URL to point to local server
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = new URL(input as string);
      const localUrl = `http://127.0.0.1:${serverPort}${url.pathname}`;
      return originalFetch(localUrl, init);
    };

    try {
      await uploadToBunnyHttp({ localFilePath: filePath, cdnPath: 'bucket/file.bin', config });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(lastRequest).not.toBeNull();
    expect(lastRequest!.body.length).toBe(TEST_CONTENT.length);
    expect(lastRequest!.headers['content-length']).toBe(String(TEST_CONTENT.length));
  });

  it('sends AccessKey header', async () => {
    const filePath = join(TEST_DIR, 'auth-test.bin');
    await writeFile(filePath, Buffer.from('data'));

    const config = createTestConfig(serverPort);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = new URL(input as string);
      const localUrl = `http://127.0.0.1:${serverPort}${url.pathname}`;
      return originalFetch(localUrl, init);
    };

    try {
      await uploadToBunnyHttp({ localFilePath: filePath, cdnPath: 'bucket/auth.bin', config });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(lastRequest!.headers['accesskey']).toBe('test-key-123');
  });

  it('URL-encodes special characters in cdnPath', async () => {
    const filePath = join(TEST_DIR, 'encode-test.bin');
    await writeFile(filePath, Buffer.from('data'));

    const config = createTestConfig(serverPort);
    let capturedUrl = '';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      capturedUrl = input as string;
      const url = new URL(input as string);
      const localUrl = `http://127.0.0.1:${serverPort}${url.pathname}`;
      return originalFetch(localUrl, init);
    };

    try {
      await uploadToBunnyHttp({ localFilePath: filePath, cdnPath: 'bucket/file#1.bin', config });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(capturedUrl).toContain('bucket/file%231.bin');
    expect(capturedUrl).not.toContain('file#1.bin');
  });

  it('throws on non-ok response', async () => {
    const filePath = join(TEST_DIR, 'fail-test.bin');
    await writeFile(filePath, Buffer.from('data'));

    serverStatusCode = 500;
    const config = createTestConfig(serverPort);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = new URL(input as string);
      const localUrl = `http://127.0.0.1:${serverPort}${url.pathname}`;
      return originalFetch(localUrl, init);
    };

    try {
      await expect(
        uploadToBunnyHttp({ localFilePath: filePath, cdnPath: 'bucket/fail.bin', config }),
      ).rejects.toThrow('Bunny HTTP upload failed');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
