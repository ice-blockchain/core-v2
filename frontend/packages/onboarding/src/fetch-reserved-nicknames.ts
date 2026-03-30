import type { FetchReservedNicknamesResult } from "./types";

// TODO: Wire to backend API when available
export async function fetchReservedNicknames(): Promise<FetchReservedNicknamesResult> {
  return { reservedNicknames: ["ion", "hades"] };
}
