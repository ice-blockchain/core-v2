import { generateUuid } from "./generate-uuid";

const STORAGE_KEY = "@ion/platform/device-id";

let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    cached = stored;
    return cached;
  }

  cached = generateUuid();
  localStorage.setItem(STORAGE_KEY, cached);
  return cached;
}
