import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { readFile, rm, writeFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import downloadFromGreenfield from './download-from-greenfield.js';

vi.mock('./fetch-with-pinned-dns.js', async () => {
  const { fetch: undiciFetch } = await import('undici');
  type UndiciInit = import('undici').RequestInit;
  return {
    default: vi.fn(async (options: { url: string; init: RequestInit }) => ({
      response: await undiciFetch(options.url, options.init as UndiciInit),
      cleanup: async () => {},
    })),
  };
});

const TEST_DIR = join('/tmp', 'greenfield-processor-dl-test');
const TEST_BODY = Buffer.from('A'.repeat(1000));
const MAX_DOWNLOAD_SIZE = 10 * 1024 * 1024;
const SEGMENT_SIZE = 64;

function computeExpectedHash(data: Buffer, segSize: number): string {
  const hashes: Buffer[] = [];
  for (let i = 0; i < data.length; i += segSize) {
    hashes.push(createHash('sha256').update(data.subarray(i, i + segSize)).digest());
  }
  return createHash('sha256').update(Buffer.concat(hashes)).digest('hex');
}
let server: Server;
let serverPort: number;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url?.includes('redirect-target')) {
      res.writeHead(302, { Location: 'http://169.254.169.254/' });
      res.end();
      return;
    }
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-/);
      if (match) {
        const start = parseInt(match[1], 10);
        if (start >= TEST_BODY.length) {
          res.writeHead(416);
          res.end();
          return;
        }
        const slice = TEST_BODY.subarray(start);
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${TEST_BODY.length - 1}/${TEST_BODY.length}`,
          'Content-Length': String(slice.length),
        });
        res.end(slice);
        return;
      }
    }
    res.writeHead(200, { 'Content-Length': String(TEST_BODY.length) });
    res.end(TEST_BODY);
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
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe('downloadFromGreenfield', () => {
  it('downloads a full file from scratch', async () => {
    const result = await downloadFromGreenfield({
      bucketName: 'test-bucket',
      objectName: 'test.bin',
      payloadSize: TEST_BODY.length,
      spEndpoint: `http://127.0.0.1:${serverPort}`,
      tempDir: TEST_DIR,
      maxDownloadSize: MAX_DOWNLOAD_SIZE,
      checksums: [],
      maxSegmentSize: SEGMENT_SIZE,
      validatedEndpoint: { ip: '127.0.0.1', family: 4 },
    });

    const content = await readFile(result);
    expect(content.length).toBe(TEST_BODY.length);
  });

  it('resumes from a partial .part file', async () => {
    const partDir = join(TEST_DIR, 'test-bucket');
    await mkdir(partDir, { recursive: true });
    const partPath = join(partDir, 'resume.bin.part');
    const partialData = TEST_BODY.subarray(0, 500);
    await writeFile(partPath, partialData);

    const result = await downloadFromGreenfield({
      bucketName: 'test-bucket',
      objectName: 'resume.bin',
      payloadSize: TEST_BODY.length,
      spEndpoint: `http://127.0.0.1:${serverPort}`,
      tempDir: TEST_DIR,
      maxDownloadSize: MAX_DOWNLOAD_SIZE,
      checksums: [],
      maxSegmentSize: SEGMENT_SIZE,
      validatedEndpoint: { ip: '127.0.0.1', family: 4 },
    });

    const content = await readFile(result);
    expect(content.length).toBe(TEST_BODY.length);
  });

  it('throws on size mismatch', async () => {
    await expect(
      downloadFromGreenfield({
        bucketName: 'test-bucket',
        objectName: 'bad-size.bin',
        payloadSize: TEST_BODY.length + 999,
        spEndpoint: `http://127.0.0.1:${serverPort}`,
        tempDir: TEST_DIR,
        maxDownloadSize: MAX_DOWNLOAD_SIZE,
        checksums: [],
        maxSegmentSize: SEGMENT_SIZE,
        validatedEndpoint: { ip: '127.0.0.1', family: 4 },
      }),
    ).rejects.toThrow('Download size mismatch');
  });

  it('rejects objectName with path traversal', async () => {
    await expect(
      downloadFromGreenfield({
        bucketName: 'test-bucket',
        objectName: '../../etc/passwd',
        payloadSize: 100,
        spEndpoint: `http://127.0.0.1:${serverPort}`,
        tempDir: TEST_DIR,
        maxDownloadSize: MAX_DOWNLOAD_SIZE,
        checksums: [],
        maxSegmentSize: SEGMENT_SIZE,
        validatedEndpoint: { ip: '127.0.0.1', family: 4 },
      }),
    ).rejects.toThrow('Path traversal detected');
  });

  it('rejects invalid bucket name', async () => {
    await expect(
      downloadFromGreenfield({
        bucketName: '../root',
        objectName: 'file.bin',
        payloadSize: 100,
        spEndpoint: `http://127.0.0.1:${serverPort}`,
        tempDir: TEST_DIR,
        maxDownloadSize: MAX_DOWNLOAD_SIZE,
        checksums: [],
        maxSegmentSize: SEGMENT_SIZE,
        validatedEndpoint: { ip: '127.0.0.1', family: 4 },
      }),
    ).rejects.toThrow('Invalid bucket name');
  });

  it('rejects downloads exceeding maxDownloadSize', async () => {
    await expect(
      downloadFromGreenfield({
        bucketName: 'test-bucket',
        objectName: 'huge.bin',
        payloadSize: 999_999_999,
        spEndpoint: `http://127.0.0.1:${serverPort}`,
        tempDir: TEST_DIR,
        maxDownloadSize: MAX_DOWNLOAD_SIZE,
        checksums: [],
        maxSegmentSize: SEGMENT_SIZE,
        validatedEndpoint: { ip: '127.0.0.1', family: 4 },
      }),
    ).rejects.toThrow('File too large');
  });

  it('succeeds when checksum matches downloaded content', async () => {
    const expected = computeExpectedHash(TEST_BODY, SEGMENT_SIZE);
    const result = await downloadFromGreenfield({
      bucketName: 'test-bucket',
      objectName: 'verified.bin',
      payloadSize: TEST_BODY.length,
      spEndpoint: `http://127.0.0.1:${serverPort}`,
      tempDir: TEST_DIR,
      maxDownloadSize: MAX_DOWNLOAD_SIZE,
      checksums: [expected],
      maxSegmentSize: SEGMENT_SIZE,
      validatedEndpoint: { ip: '127.0.0.1', family: 4 },
    });

    const content = await readFile(result);
    expect(content.length).toBe(TEST_BODY.length);
  });

  it('fails and cleans up when checksum does not match', async () => {
    await expect(
      downloadFromGreenfield({
        bucketName: 'test-bucket',
        objectName: 'bad-hash.bin',
        payloadSize: TEST_BODY.length,
        spEndpoint: `http://127.0.0.1:${serverPort}`,
        tempDir: TEST_DIR,
        maxDownloadSize: MAX_DOWNLOAD_SIZE,
        checksums: ['deadbeef'.repeat(8)],
        maxSegmentSize: SEGMENT_SIZE,
        validatedEndpoint: { ip: '127.0.0.1', family: 4 },
      }),
    ).rejects.toThrow('Integrity hash mismatch');

    const finalPath = join(TEST_DIR, 'test-bucket', 'bad-hash.bin');
    await expect(stat(finalPath)).rejects.toThrow();
  });

  it('aborts mid-stream when actual bytes exceed maxDownloadSize', async () => {
    // payloadSize passes pre-check but actual stream (1000 bytes) exceeds maxDownloadSize
    await expect(
      downloadFromGreenfield({
        bucketName: 'test-bucket',
        objectName: 'oversized.bin',
        payloadSize: 50,
        spEndpoint: `http://127.0.0.1:${serverPort}`,
        tempDir: TEST_DIR,
        maxDownloadSize: 100,
        checksums: [],
        maxSegmentSize: SEGMENT_SIZE,
        validatedEndpoint: { ip: '127.0.0.1', family: 4 },
      }),
    ).rejects.toThrow('exceeded size limit');
  });

  it('skips verification when checksums array is empty', async () => {
    const result = await downloadFromGreenfield({
      bucketName: 'test-bucket',
      objectName: 'no-checksums.bin',
      payloadSize: TEST_BODY.length,
      spEndpoint: `http://127.0.0.1:${serverPort}`,
      tempDir: TEST_DIR,
      maxDownloadSize: MAX_DOWNLOAD_SIZE,
      checksums: [],
      maxSegmentSize: SEGMENT_SIZE,
      validatedEndpoint: { ip: '127.0.0.1', family: 4 },
    });

    const content = await readFile(result);
    expect(content.length).toBe(TEST_BODY.length);
  });

  it('rejects download when SP responds with redirect', async () => {
    await expect(
      downloadFromGreenfield({
        bucketName: 'test-bucket',
        objectName: 'redirect-target.bin',
        payloadSize: TEST_BODY.length,
        spEndpoint: `http://127.0.0.1:${serverPort}`,
        tempDir: TEST_DIR,
        maxDownloadSize: MAX_DOWNLOAD_SIZE,
        checksums: [],
        maxSegmentSize: SEGMENT_SIZE,
        validatedEndpoint: { ip: '127.0.0.1', family: 4 },
      }),
    ).rejects.toThrow();
  });

  it('aborts append-mode download when stream exceeds remaining allowance', async () => {
    const partDir = join(TEST_DIR, 'test-bucket');
    await mkdir(partDir, { recursive: true });
    await writeFile(join(partDir, 'oversized-resume.bin.part'), TEST_BODY.subarray(0, 900));

    await expect(
      downloadFromGreenfield({
        bucketName: 'test-bucket',
        objectName: 'oversized-resume.bin',
        payloadSize: 950,
        spEndpoint: `http://127.0.0.1:${serverPort}`,
        tempDir: TEST_DIR,
        maxDownloadSize: 950,
        checksums: [],
        maxSegmentSize: SEGMENT_SIZE,
        validatedEndpoint: { ip: '127.0.0.1', family: 4 },
      }),
    ).rejects.toThrow('exceeded size limit');
  });

  it('cleans up .part file on checksum failure without creating final file', async () => {
    await expect(
      downloadFromGreenfield({
        bucketName: 'test-bucket',
        objectName: 'checksum-cleanup.bin',
        payloadSize: TEST_BODY.length,
        spEndpoint: `http://127.0.0.1:${serverPort}`,
        tempDir: TEST_DIR,
        maxDownloadSize: MAX_DOWNLOAD_SIZE,
        checksums: ['deadbeef'.repeat(8)],
        maxSegmentSize: SEGMENT_SIZE,
        validatedEndpoint: { ip: '127.0.0.1', family: 4 },
      }),
    ).rejects.toThrow('Integrity hash mismatch');

    const partPath = join(TEST_DIR, 'test-bucket', 'checksum-cleanup.bin.part');
    const finalPath = join(TEST_DIR, 'test-bucket', 'checksum-cleanup.bin');
    await expect(stat(partPath)).rejects.toThrow();
    await expect(stat(finalPath)).rejects.toThrow();
  });
});
