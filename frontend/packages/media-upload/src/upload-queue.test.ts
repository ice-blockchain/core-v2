import { describe, it, expect, vi } from "vitest";
import type { Transaction } from "@ion/storage";
import type { UploadDependencies } from "./types";
import { createUploadQueueInspector } from "./upload-queue";

function createMockDependencies(
  queryResult: Record<string, unknown>[],
): UploadDependencies {
  return {
    httpClient: {
      get: vi.fn(), post: vi.fn(), put: vi.fn(),
      patch: vi.fn(), delete: vi.fn(), upload: vi.fn(), head: vi.fn(),
    },
    database: {
      async execute(): Promise<void> {},
      async query<T>(): Promise<T[]> { return queryResult as T[]; },
      async executeBatch(): Promise<void> {},
      async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
        const tx: Transaction = {
          execute: vi.fn(), query: vi.fn().mockResolvedValue([]),
        };
        return fn(tx);
      },
    },
    greenfieldClient: {
      object: { delegateUploadObject: vi.fn() },
    },
    apiBaseUrl: "https://api.test.com",
  };
}

describe("upload-queue", () => {
  it("maps database records to UploadProgress objects", async () => {
    const deps = createMockDependencies([
      {
        upload_id: "u1",
        uri: "file:///a.jpg",
        mime_type: "image/jpeg",
        file_size: 2048,
        status: "uploading",
        bucket_name: "bucket-1",
        object_name: "obj-1",
        bytes_uploaded: 512,
        error_message: null,
        retry_count: 0,
        created_at: 1000,
        updated_at: 2000,
      },
    ]);

    const { getUploadQueue } = createUploadQueueInspector(deps);
    const queue = await getUploadQueue();

    expect(queue).toHaveLength(1);
    const first = queue[0]!;
    expect(first.uploadId).toBe("u1");
    expect(first.status).toBe("uploading");
    expect(first.totalBytes).toBe(2048);
    expect(first.bytesUploaded).toBe(512);
  });

  it("returns empty array when queue is empty", async () => {
    const deps = createMockDependencies([]);
    const { getUploadQueue } = createUploadQueueInspector(deps);
    const queue = await getUploadQueue();
    expect(queue).toEqual([]);
  });
});
