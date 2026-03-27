import type { SaveProfileInput, SaveProfileResult } from "./types";

// TODO: Wire to @ion/identity-client when available
export async function saveProfile(_input: SaveProfileInput): Promise<SaveProfileResult> {
  return { success: true };
}
