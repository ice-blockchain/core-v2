import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Transaction } from "@ion/storage";
import type { UploadDependencies, UploadProgress } from "./types";
import { createMediaUploader } from "./upload-media";

vi.mock("./generate-upload-id", () => ({
  generateUploadId: () => "test-upload-id",
}));

vi.mock("./request-delegation", () => ({
  requestDelegation: vi.fn().mockResolvedValue({
    bucketName: "test-bucket",
    objectName: "test-object",
    authType: "EDDSA",
    domain: "test.com",
    seedString: "seed-123",
    address: "0xabc",
  }),
}));

vi.mock("./greenfield-upload", () => ({
  greenfieldUpload: vi.fn().mockResolvedValue(undefined),
}));

function createMockDatabase() {
  const store = new Map<string, Record<string, unknown>>();

  return {
    async execute(sql: string, params?: unknown[]): Promise<void> {
      if (sql.includes("INSERT")) {
        store.set(params?.[0] as string, {
          upload_id: params?.[0],
          status: params?.[4],
        });
      }
      if (sql.includes("UPDATE") && sql.includes("status = ?")) {
        const id = params?.[params.length - 1] as string;
        const item = store.get(id);
        if (item) item.status = params?.[0];
      }
      if (sql.includes("'completed'")) {
        const id = params?.[params.length - 1] as string;
        const item = store.get(id);
        if (item) item.status = "completed";
      }
    },
    async query<T>(): Promise<T[]> { return [] as T[]; },
    async executeBatch(): Promise<void> {},
    async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
      const tx: Transaction = {
        execute: vi.fn(), query: vi.fn().mockResolvedValue([]),
      };
      return fn(tx);
    },
  };
}

function createMockDependencies(): UploadDependencies {
  return {
    httpClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      upload: vi.fn(),
      head: vi.fn(),
    },
    database: createMockDatabase(),
    greenfieldClient: {
      object: {
        delegateUploadObject: vi.fn().mockResolvedValue({}),
      },
    },
    apiBaseUrl: "https://api.test.com",
  };
}

describe("upload-media", () => {
  let deps: UploadDependencies;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDependencies();
  });

  it("completes full upload flow and returns result", async () => {
    const { uploadMedia } = createMediaUploader(deps);

    const result = await uploadMedia({
      uri: "file:///photo.jpg",
      mimeType: "image/jpeg",
      fileSize: 2048,
    });

    expect(result.bucketName).toBe("test-bucket");
    expect(result.objectName).toBe("test-object");
    expect(result.fileSize).toBe(2048);
  });

  it("reports progress through all stages", async () => {
    const { uploadMedia } = createMediaUploader(deps);
    const statuses: string[] = [];

    await uploadMedia(
      { uri: "file:///photo.jpg", mimeType: "image/jpeg", fileSize: 1024 },
      (progress: UploadProgress) => { statuses.push(progress.status); },
    );

    expect(statuses).toContain("requesting-delegation");
    expect(statuses).toContain("uploading");
    expect(statuses).toContain("completed");
  });

  it("marks upload as failed when delegation request fails", async () => {
    const { requestDelegation } = await import("./request-delegation");
    vi.mocked(requestDelegation).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const { uploadMedia } = createMediaUploader(deps);

    await expect(
      uploadMedia({ uri: "file:///photo.jpg", mimeType: "image/jpeg", fileSize: 1024 }),
    ).rejects.toThrow("Network error");
  });

  it("marks upload as failed when greenfield upload fails", async () => {
    const { greenfieldUpload } = await import("./greenfield-upload");
    vi.mocked(greenfieldUpload).mockRejectedValueOnce(
      new Error("SP unavailable"),
    );

    const { uploadMedia } = createMediaUploader(deps);

    await expect(
      uploadMedia({ uri: "file:///photo.jpg", mimeType: "image/jpeg", fileSize: 1024 }),
    ).rejects.toThrow("SP unavailable");
  });
});
