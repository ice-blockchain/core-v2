import type { Database } from "@ion/storage";
import type { UploadQueueRecord, UploadStatus } from "./types";

const INSERT_SQL = `INSERT INTO upload_queue
  (upload_id, uri, mime_type, file_size, status, bytes_uploaded, retry_count, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

type InsertRecord = Omit<UploadQueueRecord, "bucket_name" | "object_name" | "error_message">;

function buildInsertParams(record: InsertRecord): unknown[] {
  return [
    record.upload_id, record.uri, record.mime_type, record.file_size,
    record.status, record.bytes_uploaded, record.retry_count,
    record.created_at, record.updated_at,
  ];
}

async function insertItem(db: Database, record: InsertRecord): Promise<void> {
  await db.execute(INSERT_SQL, buildInsertParams(record));
}

async function getItem(db: Database, uploadId: string): Promise<UploadQueueRecord | null> {
  const rows = await db.query<UploadQueueRecord>(
    "SELECT * FROM upload_queue WHERE upload_id = ?", [uploadId],
  );
  return rows[0] ?? null;
}

async function getAllItems(db: Database): Promise<UploadQueueRecord[]> {
  return db.query<UploadQueueRecord>("SELECT * FROM upload_queue ORDER BY created_at DESC");
}

async function getItemsByStatus(db: Database, status: UploadStatus): Promise<UploadQueueRecord[]> {
  return db.query<UploadQueueRecord>(
    "SELECT * FROM upload_queue WHERE status = ? ORDER BY created_at ASC", [status],
  );
}

const TERMINAL_STATUSES: UploadStatus[] = ["completed", "cancelled"];

async function updateStatus(db: Database, uploadId: string, status: UploadStatus): Promise<void> {
  await db.execute(
    "UPDATE upload_queue SET status = ?, updated_at = ? WHERE upload_id = ?",
    [status, Date.now(), uploadId],
  );
}

async function updateStatusIfNotTerminal(db: Database, uploadId: string, status: UploadStatus): Promise<boolean> {
  const placeholders = TERMINAL_STATUSES.map(() => "?").join(", ");
  const sql = `UPDATE upload_queue SET status = ?, updated_at = ? WHERE upload_id = ? AND status NOT IN (${placeholders})`;
  await db.execute(sql, [status, Date.now(), uploadId, ...TERMINAL_STATUSES]);
  const row = await getItem(db, uploadId);
  return row?.status === status;
}

interface DelegationUpdate {
  uploadId: string;
  bucketName: string;
  objectName: string;
}

async function updateDelegation(db: Database, update: DelegationUpdate): Promise<void> {
  await db.execute(
    "UPDATE upload_queue SET bucket_name = ?, object_name = ?, updated_at = ? WHERE upload_id = ?",
    [update.bucketName, update.objectName, Date.now(), update.uploadId],
  );
}

async function updateCompletion(db: Database, uploadId: string): Promise<void> {
  await db.execute(
    "UPDATE upload_queue SET status = 'completed', updated_at = ? WHERE upload_id = ?",
    [Date.now(), uploadId],
  );
}

async function updateFailure(db: Database, uploadId: string, errorMessage: string): Promise<void> {
  await db.execute(
    `UPDATE upload_queue SET status = 'failed', error_message = ?, retry_count = retry_count + 1, updated_at = ? WHERE upload_id = ?`,
    [errorMessage, Date.now(), uploadId],
  );
}

async function deleteItem(db: Database, uploadId: string): Promise<void> {
  await db.execute("DELETE FROM upload_queue WHERE upload_id = ?", [uploadId]);
}

export function createUploadQueueRepository(database: Database) {
  return {
    insertItem: (record: InsertRecord) => insertItem(database, record),
    getItem: (uploadId: string) => getItem(database, uploadId),
    getAllItems: () => getAllItems(database),
    getItemsByStatus: (status: UploadStatus) => getItemsByStatus(database, status),
    updateStatus: (uploadId: string, status: UploadStatus) => updateStatus(database, uploadId, status),
    updateStatusIfNotTerminal: (uploadId: string, status: UploadStatus) => updateStatusIfNotTerminal(database, uploadId, status),
    updateDelegation: (uploadId: string, bucketName: string, objectName: string) =>
      updateDelegation(database, { uploadId, bucketName, objectName }),
    updateCompletion: (uploadId: string) => updateCompletion(database, uploadId),
    updateFailure: (uploadId: string, msg: string) => updateFailure(database, uploadId, msg),
    deleteItem: (uploadId: string) => deleteItem(database, uploadId),
  } as const;
}
