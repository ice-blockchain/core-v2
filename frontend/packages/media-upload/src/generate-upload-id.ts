export function generateUploadId(): string {
  return crypto.randomUUID();
}
