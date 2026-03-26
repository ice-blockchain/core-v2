import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Transaction } from "@ion/storage";
import type { UploadDependencies } from "./types";
import { createUploadCanceller } from "./cancel-upload";
import { cancellationRegistry } from "./cancellation-registry";

function createMockDependencies(): UploadDependencies {
  return {
    httpClient: {
      get: vi.fn(), post: vi.fn(), put: vi.fn(),
      patch: vi.fn(), delete: vi.fn(), upload: vi.fn(),
    },
    database: {
      async execute(): Promise<void> {},
      async query<T>(): Promise<T[]> { return [] as T[]; },
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

describe("cancel-upload", () => {
  let deps: UploadDependencies;

  beforeEach(() => {
    deps = createMockDependencies();
  });

  it("aborts the controller signal and returns true", async () => {
    const controller = cancellationRegistry.register("upload-1");
    expect(controller.signal.aborted).toBe(false);

    const { cancelUpload } = createUploadCanceller(deps);
    const result = await cancelUpload("upload-1");

    expect(result).toBe(true);
    expect(controller.signal.aborted).toBe(true);
  });

  it("returns false when cancelling a non-existent upload", async () => {
    const { cancelUpload } = createUploadCanceller(deps);
    const result = await cancelUpload("non-existent");
    expect(result).toBe(false);
  });

  it("updates the database status to cancelled", async () => {
    cancellationRegistry.register("upload-2");

    const executeSpy = vi.spyOn(deps.database, "execute");
    const { cancelUpload } = createUploadCanceller(deps);

    await cancelUpload("upload-2");

    expect(executeSpy).toHaveBeenCalledWith(
      expect.stringContaining("status = ?"),
      expect.arrayContaining(["cancelled"]),
    );
  });
});
