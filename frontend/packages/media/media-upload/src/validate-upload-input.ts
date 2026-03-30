import type { UploadInput } from "./types";

const MIME_TYPE_PATTERN = /^[a-z]+\/[a-z0-9.+-]+$/i;

export function validateUploadInput(input: UploadInput): void {
  if (!input.uri || input.uri.trim().length === 0) {
    throw new Error("Upload URI must not be empty");
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    throw new Error("Upload fileSize must be a positive number");
  }

  if (!MIME_TYPE_PATTERN.test(input.mimeType)) {
    throw new Error(`Invalid mimeType: ${input.mimeType}`);
  }
}
