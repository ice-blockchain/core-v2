import type { ValidateNicknameResult } from "./types";

const NICKNAME_PATTERN = /^[a-z0-9.]+$/;

// TODO: Wire to @ion/identity-client when available
export async function validateNickname(nickname: string): Promise<ValidateNicknameResult> {
  const isValid = nickname.length > 0 && NICKNAME_PATTERN.test(nickname);
  return { isAvailable: isValid, isReserved: false };
}
