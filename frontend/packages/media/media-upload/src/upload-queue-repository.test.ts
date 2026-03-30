import { describe, it, expect, beforeEach } from "vitest";
import type { Database, Transaction } from "@ion/storage";
import { createUploadQueueRepository } from "./upload-queue-repository";

function createInMemoryDatabase(): Database {
  return {
    async execute(sql: string, params?: unknown[]): Promise<void> {
      executeSql(sql, params);
    },
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      return querySql(sql, params) as T[];
    },
    async executeBatch(statements): Promise<void> {
      for (const stmt of statements) {
        executeSql(stmt.sql, stmt.params);
      }
    },
    async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
      const tx: Transaction = {
        async execute(sql, params) { executeSql(sql, params); },
        async query(sql, params) { return querySql(sql, params) as never; },
      };
      return fn(tx);
    },
  };
}

const store: Record<string, unknown>[] = [];

function executeSql(
  sql: string,
  params?: unknown[],
): void {
  const trimmed = sql.trim().toUpperCase();

  if (trimmed.startsWith("CREATE TABLE")) {
    store.length = 0;
    return;
  }

  if (trimmed.startsWith("INSERT")) {
    const values = params ?? [];
    const record: Record<string, unknown> = {
      upload_id: values[0],
      uri: values[1],
      mime_type: values[2],
      file_size: values[3],
      status: values[4],
      bytes_uploaded: values[5],
      retry_count: values[6],
      created_at: values[7],
      updated_at: values[8],
      bucket_name: null,
      object_name: null,
      error_message: null,
    };
    store.push(record);
    return;
  }

  if (trimmed.startsWith("UPDATE")) {
    const id = params?.[params.length - 1] as string;
    const item = store.find((r) => r.upload_id === id);
    if (!item) return;

    if (sql.includes("bucket_name")) {
      item.bucket_name = params?.[0];
      item.object_name = params?.[1];
      item.updated_at = params?.[2];
    } else if (sql.includes("'completed'")) {
      item.status = "completed";
      item.updated_at = params?.[0];
    } else if (sql.includes("'failed'")) {
      item.status = "failed";
      item.error_message = params?.[0];
      item.retry_count = (item.retry_count as number) + 1;
      item.updated_at = params?.[1];
    } else if (sql.includes("status = ?")) {
      item.status = params?.[0];
      item.updated_at = params?.[1];
    }
    return;
  }

  if (trimmed.startsWith("DELETE")) {
    const id = params?.[0] as string;
    const index = store.findIndex((r) => r.upload_id === id);
    if (index >= 0) store.splice(index, 1);
  }
}

function querySql(
  sql: string,
  params?: unknown[],
): Record<string, unknown>[] {
  if (sql.includes("WHERE upload_id")) {
    return store.filter((r) => r.upload_id === params?.[0]);
  }
  if (sql.includes("WHERE status")) {
    return store
      .filter((r) => r.status === params?.[0])
      .sort((a, b) => (a.created_at as number) - (b.created_at as number));
  }
  return [...store].sort(
    (a, b) => (b.created_at as number) - (a.created_at as number),
  );
}

describe("upload-queue-repository", () => {
  let database: Database;
  let repository: ReturnType<typeof createUploadQueueRepository>;

  beforeEach(async () => {
    store.length = 0;
    database = createInMemoryDatabase();
    await database.execute("CREATE TABLE upload_queue ...");
    repository = createUploadQueueRepository(database);
  });

  it("inserts and retrieves a queue item", async () => {
    await repository.insertItem({
      upload_id: "test-1",
      uri: "file:///photo.jpg",
      mime_type: "image/jpeg",
      file_size: 1024,
      status: "queued",
      bytes_uploaded: 0,
      retry_count: 0,
      created_at: 1000,
      updated_at: 1000,
    });

    const item = await repository.getItem("test-1");
    expect(item).not.toBeNull();
    expect(item?.uri).toBe("file:///photo.jpg");
    expect(item?.status).toBe("queued");
  });

  it("returns null for non-existent item", async () => {
    const item = await repository.getItem("missing");
    expect(item).toBeNull();
  });

  it("returns all items ordered by created_at descending", async () => {
    await repository.insertItem({
      upload_id: "a", uri: "file:///a.jpg", mime_type: "image/jpeg",
      file_size: 100, status: "queued", bytes_uploaded: 0,
      retry_count: 0, created_at: 1000, updated_at: 1000,
    });
    await repository.insertItem({
      upload_id: "b", uri: "file:///b.jpg", mime_type: "image/jpeg",
      file_size: 200, status: "queued", bytes_uploaded: 0,
      retry_count: 0, created_at: 2000, updated_at: 2000,
    });

    const items = await repository.getAllItems();
    expect(items).toHaveLength(2);
    expect(items[0]!.upload_id).toBe("b");
  });

  it("filters items by status", async () => {
    await repository.insertItem({
      upload_id: "a", uri: "file:///a.jpg", mime_type: "image/jpeg",
      file_size: 100, status: "queued", bytes_uploaded: 0,
      retry_count: 0, created_at: 1000, updated_at: 1000,
    });
    await repository.insertItem({
      upload_id: "b", uri: "file:///b.jpg", mime_type: "image/jpeg",
      file_size: 200, status: "failed", bytes_uploaded: 0,
      retry_count: 1, created_at: 2000, updated_at: 2000,
    });

    const queued = await repository.getItemsByStatus("queued");
    expect(queued).toHaveLength(1);
    expect(queued[0]!.upload_id).toBe("a");
  });

  it("updates status of a queue item", async () => {
    await repository.insertItem({
      upload_id: "test-1", uri: "file:///a.jpg", mime_type: "image/jpeg",
      file_size: 100, status: "queued", bytes_uploaded: 0,
      retry_count: 0, created_at: 1000, updated_at: 1000,
    });

    await repository.updateStatus("test-1", "uploading");
    const item = await repository.getItem("test-1");
    expect(item?.status).toBe("uploading");
  });

  it("updates delegation info", async () => {
    await repository.insertItem({
      upload_id: "test-1", uri: "file:///a.jpg", mime_type: "image/jpeg",
      file_size: 100, status: "queued", bytes_uploaded: 0,
      retry_count: 0, created_at: 1000, updated_at: 1000,
    });

    await repository.updateDelegation("test-1", "my-bucket", "obj-123");
    const item = await repository.getItem("test-1");
    expect(item?.bucket_name).toBe("my-bucket");
    expect(item?.object_name).toBe("obj-123");
  });

  it("marks item as completed", async () => {
    await repository.insertItem({
      upload_id: "test-1", uri: "file:///a.jpg", mime_type: "image/jpeg",
      file_size: 100, status: "uploading", bytes_uploaded: 0,
      retry_count: 0, created_at: 1000, updated_at: 1000,
    });

    await repository.updateCompletion("test-1");
    const item = await repository.getItem("test-1");
    expect(item?.status).toBe("completed");
  });

  it("marks item as failed and increments retry count", async () => {
    await repository.insertItem({
      upload_id: "test-1", uri: "file:///a.jpg", mime_type: "image/jpeg",
      file_size: 100, status: "uploading", bytes_uploaded: 0,
      retry_count: 0, created_at: 1000, updated_at: 1000,
    });

    await repository.updateFailure("test-1", "Network error");
    const item = await repository.getItem("test-1");
    expect(item?.status).toBe("failed");
    expect(item?.error_message).toBe("Network error");
    expect(item?.retry_count).toBe(1);
  });

  it("deletes an item", async () => {
    await repository.insertItem({
      upload_id: "test-1", uri: "file:///a.jpg", mime_type: "image/jpeg",
      file_size: 100, status: "queued", bytes_uploaded: 0,
      retry_count: 0, created_at: 1000, updated_at: 1000,
    });

    await repository.deleteItem("test-1");
    const item = await repository.getItem("test-1");
    expect(item).toBeNull();
  });
});
