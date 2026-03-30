import type { ValidateNicknameResult } from "./types";

const NICKNAME_PATTERN = /^[a-z0-9.]+$/;

// TODO: Wire to @ion/identity-client when available
export async function validateNickname(nickname: string, reservedNicknames: Set<string>): Promise<ValidateNicknameResult> {
  const isValid = nickname.length > 0 && NICKNAME_PATTERN.test(nickname);
  if (!isValid) return { isAvailable: false, isReserved: false };
  if (reservedNicknames.has(nickname)) return { isAvailable: false, isReserved: true };
  return { isAvailable: true, isReserved: false };
}
