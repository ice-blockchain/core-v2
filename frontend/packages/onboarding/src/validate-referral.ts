import type { ValidateReferralResult } from "./types";

// TODO: Wire to @ion/identity-client when available
export async function validateReferral(_nickname: string): Promise<ValidateReferralResult> {
  throw new Error("validateReferral not implemented — wire to @ion/identity-client");
}
