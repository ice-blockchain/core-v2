const SAFE_FILE_ID_PATTERN = /^[\w\-.]+$/;

export function validateFileId(fileId: string): void {
  if (!fileId || !SAFE_FILE_ID_PATTERN.test(fileId)) {
    throw new Error(`Invalid file ID: must match ${SAFE_FILE_ID_PATTERN.source}`);
  }
}
