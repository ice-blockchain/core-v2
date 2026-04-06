import type { Database } from '@ion/storage';
import type { DownloadQueueRecord, DownloadStatus } from './types';
import { TERMINAL_STATUSES } from './types';

export function createDownloadQueueRepository(database: Database) {
  return {
    insertItem: (record: DownloadQueueRecord) => insertItem(database, record),
    getItem: (downloadId: string) => getItem(database, downloadId),
    getItemByFileId: (fileId: string) => getItemByFileId(database, fileId),
    getItemsByStatus: (status: DownloadStatus) => getItemsByStatus(database, status),
    getAllItems: () => getAllItems(database),
    updateStatus: (downloadId: string, status: DownloadStatus) => updateStatus(database, downloadId, status),
    updateStatusIfNotTerminal: (downloadId: string, status: DownloadStatus) => updateStatusIfNotTerminal(database, downloadId, status),
    updateResolution: (downloadId: string, data: ResolutionData) => updateResolution(database, downloadId, data),
    updateProgress: (downloadId: string, bytesDownloaded: number) => updateProgress(database, downloadId, bytesDownloaded),
    updateCompletion: (downloadId: string, localPath: string) => updateCompletion(database, downloadId, localPath),
    updateFailure: (downloadId: string, errorMessage: string) => updateFailure(database, downloadId, errorMessage),
    deleteItem: (downloadId: string) => deleteItem(database, downloadId),
  } as const;
}

interface ResolutionData {
  cdnUrl: string | null;
  tonBagId: string | null;
  tonFileIndex: number | null;
  fileSize: number;
}

async function insertItem(database: Database, record: DownloadQueueRecord): Promise<void> {
  await database.execute(
    `INSERT INTO download_queue (download_id, file_id, status, file_size, bytes_downloaded, retry_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [record.download_id, record.file_id, record.status, record.file_size, record.bytes_downloaded, record.retry_count, record.created_at, record.updated_at],
  );
}

async function getItem(database: Database, downloadId: string): Promise<DownloadQueueRecord | null> {
  const rows = await database.query<DownloadQueueRecord>('SELECT * FROM download_queue WHERE download_id = ?', [downloadId]);
  return rows[0] ?? null;
}

async function getItemByFileId(database: Database, fileId: string): Promise<DownloadQueueRecord | null> {
  const rows = await database.query<DownloadQueueRecord>('SELECT * FROM download_queue WHERE file_id = ? ORDER BY created_at DESC LIMIT 1', [fileId]);
  return rows[0] ?? null;
}

async function getItemsByStatus(database: Database, status: DownloadStatus): Promise<DownloadQueueRecord[]> {
  return database.query<DownloadQueueRecord>('SELECT * FROM download_queue WHERE status = ? ORDER BY created_at ASC', [status]);
}

async function getAllItems(database: Database): Promise<DownloadQueueRecord[]> {
  return database.query<DownloadQueueRecord>('SELECT * FROM download_queue ORDER BY created_at DESC');
}

async function updateStatus(database: Database, downloadId: string, status: DownloadStatus): Promise<void> {
  await database.execute('UPDATE download_queue SET status = ?, updated_at = ? WHERE download_id = ?', [status, Date.now(), downloadId]);
}

async function updateStatusIfNotTerminal(database: Database, downloadId: string, status: DownloadStatus): Promise<boolean> {
  const placeholders = TERMINAL_STATUSES.map(() => '?').join(', ');
  await database.execute(
    `UPDATE download_queue SET status = ?, updated_at = ? WHERE download_id = ? AND status NOT IN (${placeholders})`,
    [status, Date.now(), downloadId, ...TERMINAL_STATUSES],
  );
  const row = await getItem(database, downloadId);
  return row?.status === status;
}

async function updateResolution(database: Database, downloadId: string, data: ResolutionData): Promise<void> {
  await database.execute(
    'UPDATE download_queue SET cdn_url = ?, ton_bag_id = ?, ton_file_index = ?, file_size = ?, updated_at = ? WHERE download_id = ?',
    [data.cdnUrl, data.tonBagId, data.tonFileIndex, data.fileSize, Date.now(), downloadId],
  );
}

async function updateProgress(database: Database, downloadId: string, bytesDownloaded: number): Promise<void> {
  await database.execute('UPDATE download_queue SET bytes_downloaded = ?, updated_at = ? WHERE download_id = ?', [bytesDownloaded, Date.now(), downloadId]);
}

async function updateCompletion(database: Database, downloadId: string, localPath: string): Promise<void> {
  await database.execute(
    'UPDATE download_queue SET status = ?, local_path = ?, updated_at = ? WHERE download_id = ?',
    ['completed', localPath, Date.now(), downloadId],
  );
}

async function updateFailure(database: Database, downloadId: string, errorMessage: string): Promise<void> {
  await database.execute(
    'UPDATE download_queue SET status = ?, error_message = ?, retry_count = retry_count + 1, updated_at = ? WHERE download_id = ?',
    ['failed', errorMessage, Date.now(), downloadId],
  );
}

async function deleteItem(database: Database, downloadId: string): Promise<void> {
  await database.execute('DELETE FROM download_queue WHERE download_id = ?', [downloadId]);
}
