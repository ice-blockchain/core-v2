import type { ValidateReferralResult } from "./types";

const NICKNAME_PATTERN = /^[a-z0-9.]+$/;

// TODO: Wire to @ion/identity-client when available
export async function validateReferral(nickname: string): Promise<ValidateReferralResult> {
  return { isValid: nickname.length > 0 && NICKNAME_PATTERN.test(nickname) };
}
