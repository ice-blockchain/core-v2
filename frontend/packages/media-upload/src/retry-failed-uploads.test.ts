import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Transaction } from "@ion/storage";
import type { UploadDependencies } from "./types";
import { createUploadRetrier } from "./retry-failed-uploads";

vi.mock("./request-delegation", () => ({
  requestDelegation: vi.fn().mockResolvedValue({
    bucketName: "retry-bucket",
    objectName: "retry-object",
    authType: "EDDSA",
    domain: "test.com",
    seedString: "seed-123",
    address: "0xabc",
  }),
}));

vi.mock("./greenfield-upload", () => ({
  greenfieldUpload: vi.fn().mockResolvedValue(undefined),
}));

function createMockDependencies(
  failedItems: Record<string, unknown>[],
): UploadDependencies {
  return {
    httpClient: {
      get: vi.fn(), post: vi.fn(), put: vi.fn(),
      patch: vi.fn(), delete: vi.fn(), upload: vi.fn(), head: vi.fn(),
    },
    database: {
      async execute(): Promise<void> {},
      async query<T>(_sql: string, params?: unknown[]): Promise<T[]> {
        if (params?.[0] === "failed") return failedItems as T[];
        return [] as T[];
      },
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

describe("retry-failed-uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests fresh delegation on retry even with existing bucket", async () => {
    const deps = createMockDependencies([
      {
        upload_id: "fail-1",
        uri: "file:///a.jpg",
        mime_type: "image/jpeg",
        file_size: 1024,
        status: "failed",
        bucket_name: "existing-bucket",
        object_name: "existing-object",
        bytes_uploaded: 0,
        error_message: "timeout",
        retry_count: 1,
        created_at: 1000,
        updated_at: 2000,
      },
    ]);

    const { retryFailedUploads } = createUploadRetrier(deps);
    const results = await retryFailedUploads();

    expect(results).toHaveLength(1);
    expect(results[0]!.bucketName).toBe("retry-bucket");
    expect(results[0]!.objectName).toBe("retry-object");
  });

  it("retries failed items without delegation by requesting new one", async () => {
    const deps = createMockDependencies([
      {
        upload_id: "fail-2",
        uri: "file:///b.jpg",
        mime_type: "image/png",
        file_size: 2048,
        status: "failed",
        bucket_name: null,
        object_name: null,
        bytes_uploaded: 0,
        error_message: "network error",
        retry_count: 0,
        created_at: 1000,
        updated_at: 2000,
      },
    ]);

    const { retryFailedUploads } = createUploadRetrier(deps);
    const results = await retryFailedUploads();

    expect(results).toHaveLength(1);
    expect(results[0]!.bucketName).toBe("retry-bucket");
    expect(results[0]!.objectName).toBe("retry-object");
  });

  it("skips items that exceeded max retry count", async () => {
    const deps = createMockDependencies([
      {
        upload_id: "fail-3",
        uri: "file:///c.jpg",
        mime_type: "image/jpeg",
        file_size: 512,
        status: "failed",
        bucket_name: "b",
        object_name: "o",
        bytes_uploaded: 0,
        error_message: "persistent failure",
        retry_count: 5,
        created_at: 1000,
        updated_at: 2000,
      },
    ]);

    const { retryFailedUploads } = createUploadRetrier(deps);
    const results = await retryFailedUploads();

    expect(results).toHaveLength(0);
  });

  it("uses auth from same delegation as bucket and object", async () => {
    const { greenfieldUpload } = await import("./greenfield-upload");
    const deps = createMockDependencies([
      {
        upload_id: "fail-auth",
        uri: "file:///d.jpg",
        mime_type: "image/jpeg",
        file_size: 512,
        status: "failed",
        bucket_name: "old-bucket",
        object_name: "old-object",
        bytes_uploaded: 0,
        error_message: "auth error",
        retry_count: 0,
        created_at: 1000,
        updated_at: 2000,
      },
    ]);

    const { retryFailedUploads } = createUploadRetrier(deps);
    await retryFailedUploads();

    const call = vi.mocked(greenfieldUpload).mock.calls[0]!;
    const params = call[1]!;
    expect(params.bucketName).toBe("retry-bucket");
    expect(params.auth.domain).toBe("test.com");
    expect(params.auth.seedString).toBe("seed-123");
    expect(params.auth.address).toBe("0xabc");
  });

  it("returns empty array when no failed items exist", async () => {
    const deps = createMockDependencies([]);
    const { retryFailedUploads } = createUploadRetrier(deps);
    const results = await retryFailedUploads();
    expect(results).toEqual([]);
  });
});
