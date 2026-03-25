import type { SaveProfileInput, SaveProfileResult } from "./types";

// TODO: Wire to @ion/identity-client when available
export async function saveProfile(_input: SaveProfileInput): Promise<SaveProfileResult> {
  throw new Error("saveProfile not implemented — wire to @ion/identity-client");
}
