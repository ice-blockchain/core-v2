import type { Readable } from 'node:stream';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import uploadToBunnyFtp from './upload-to-bunny-ftp.js';

const TEST_DIR = '/tmp/greenfield-processor-ftp-test';
let testCounter = 0;

function createMockFtpClient(remoteFileSize: number) {
  let currentRemoteSize = remoteFileSize;

  return {
    size: vi.fn(async () => {
      if (currentRemoteSize === -1) throw new Error('File not found');
      return currentRemoteSize;
    }),
    uploadFrom: vi.fn(async () => {
      currentRemoteSize = 1000;
    }),
    appendFrom: vi.fn(async (stream: Readable) => {
      stream.destroy();
      currentRemoteSize = 1000;
    }),
    remove: vi.fn(async () => {}),
    pwd: vi.fn(async () => '/'),
    ensureDir: vi.fn(async () => {}),
    cd: vi.fn(async () => {}),
  };
}

async function createTestFile(): Promise<string> {
  testCounter += 1;
  const filePath = join(TEST_DIR, `test-${testCounter}.bin`);
  await writeFile(filePath, Buffer.alloc(1000));
  return filePath;
}

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

describe('uploadToBunnyFtp', () => {
  it('performs fresh upload when remote file does not exist', async () => {
    const localPath = await createTestFile();
    const client = createMockFtpClient(-1);

    await uploadToBunnyFtp({
      localFilePath: localPath,
      remotePath: '/zone/bucket/fresh.bin',
      ftpClient: client as never,
    });

    expect(client.uploadFrom).toHaveBeenCalledOnce();
    expect(client.appendFrom).not.toHaveBeenCalled();
  });

  it('skips upload when remote file matches local size', async () => {
    const localPath = await createTestFile();
    const client = createMockFtpClient(1000);

    await uploadToBunnyFtp({
      localFilePath: localPath,
      remotePath: '/zone/bucket/complete.bin',
      ftpClient: client as never,
    });

    expect(client.uploadFrom).not.toHaveBeenCalled();
    expect(client.appendFrom).not.toHaveBeenCalled();
  });

  it('resumes upload when remote file is partially uploaded', async () => {
    const localPath = await createTestFile();
    const client = createMockFtpClient(500);

    await uploadToBunnyFtp({
      localFilePath: localPath,
      remotePath: '/zone/bucket/partial.bin',
      ftpClient: client as never,
    });

    expect(client.appendFrom).toHaveBeenCalledOnce();
    expect(client.uploadFrom).not.toHaveBeenCalled();
  });

  it('deletes and re-uploads when remote is larger than local', async () => {
    const localPath = await createTestFile();
    const client = createMockFtpClient(2000);

    await uploadToBunnyFtp({
      localFilePath: localPath,
      remotePath: '/zone/bucket/corrupt.bin',
      ftpClient: client as never,
    });

    expect(client.remove).toHaveBeenCalledOnce();
    expect(client.uploadFrom).toHaveBeenCalledOnce();
  });
});
