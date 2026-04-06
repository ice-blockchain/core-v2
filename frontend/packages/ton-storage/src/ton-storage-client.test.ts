import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTonStorageClient } from './ton-storage-client';
import type { HttpClient } from '@ion/network';

const VALID_BAG_ID = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
const VALID_BAG_ID_2 = '1111111111111111111111111111111111111111111111111111111111111111';

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn().mockResolvedValue({ body: { bags: [] }, status: 200, headers: {} }),
    head: vi.fn().mockResolvedValue({ body: null, status: 200, headers: {} }),
    post: vi.fn().mockResolvedValue({ body: { ok: true }, status: 200, headers: {} }),
    put: vi.fn().mockResolvedValue({ body: null, status: 200, headers: {} }),
    patch: vi.fn().mockResolvedValue({ body: null, status: 200, headers: {} }),
    delete: vi.fn().mockResolvedValue({ body: null, status: 200, headers: {} }),
    upload: vi.fn().mockResolvedValue({ body: null, status: 200, headers: {} }),
  };
}

beforeEach(() => vi.clearAllMocks());

describe('createTonStorageClient', () => {
  it('adds a bag via POST /api/v1/add', async () => {
    const http = createMockHttpClient();
    const client = createTonStorageClient(http);
    await client.addBag({ bagId: VALID_BAG_ID, downloadPath: '/tmp' });
    expect(http.post).toHaveBeenCalledWith('/api/v1/add', expect.objectContaining({
      body: expect.objectContaining({ bag_id: VALID_BAG_ID, path: '/tmp', download_all: true }),
    }));
  });

  it('removes a bag via POST /api/v1/remove', async () => {
    const http = createMockHttpClient();
    const client = createTonStorageClient(http);
    await client.removeBag(VALID_BAG_ID, true);
    expect(http.post).toHaveBeenCalledWith('/api/v1/remove', expect.objectContaining({
      body: { bag_id: VALID_BAG_ID, with_files: true },
    }));
  });

  it('stops a bag via POST /api/v1/stop', async () => {
    const http = createMockHttpClient();
    const client = createTonStorageClient(http);
    await client.stopBag(VALID_BAG_ID);
    expect(http.post).toHaveBeenCalledWith('/api/v1/stop', expect.objectContaining({
      body: { bag_id: VALID_BAG_ID },
    }));
  });

  it('maps snake_case bag details to camelCase', async () => {
    const http = createMockHttpClient();
    const rawDetails = {
      bag_id: VALID_BAG_ID, description: 'test', size: 1024, downloaded: 512,
      files_count: 2, dir_name: 'dir', completed: false, active: true,
      seeding: false, header_loaded: true, peers: 3,
      upload_speed: 100, download_speed: 200,
      files: [{ index: 0, name: 'file.txt', size: 512 }],
      piece_size: 256, bag_pieces_num: 4, path: '/data',
    };
    vi.mocked(http.get).mockResolvedValue({ body: rawDetails, status: 200, headers: {} } as never);
    const client = createTonStorageClient(http);
    const result = await client.getBagDetails(VALID_BAG_ID);
    expect(result.bagId).toBe(VALID_BAG_ID);
    expect(result.totalSize).toBe(1024);
    expect(result.downloadedSize).toBe(512);
    expect(result.files[0]!.name).toBe('file.txt');
    expect(result.pieceSize).toBe(256);
  });

  it('maps list response and unwraps bags array', async () => {
    const http = createMockHttpClient();
    const rawBags = {
      bags: [
        {
          bag_id: VALID_BAG_ID_2, description: '', size: 100, downloaded: 50,
          files_count: 1, dir_name: 'd', completed: false, active: true,
          seeding: false, header_loaded: true, peers: 1,
          upload_speed: 10, download_speed: 20,
        },
      ],
    };
    vi.mocked(http.get).mockResolvedValue({ body: rawBags, status: 200, headers: {} } as never);
    const client = createTonStorageClient(http);
    const result = await client.listBags();
    expect(result).toHaveLength(1);
    expect(result[0]!.bagId).toBe(VALID_BAG_ID_2);
    expect(result[0]!.isActive).toBe(true);
  });

  it('constructs local file path from bagId and fileIndex', () => {
    const http = createMockHttpClient();
    const client = createTonStorageClient(http);
    const path = client.getFilePath(VALID_BAG_ID, 2);
    expect(path).toBe(`${VALID_BAG_ID}/2`);
  });

  it('rejects invalid bag ID format', async () => {
    const http = createMockHttpClient();
    const client = createTonStorageClient(http);
    await expect(client.addBag({ bagId: '../evil', downloadPath: '/tmp' })).rejects.toThrow('Invalid bag ID');
    expect(() => client.getFilePath('not-hex', 0)).toThrow('Invalid bag ID');
  });
});
