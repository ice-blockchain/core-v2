import type { ValidateNicknameResult } from "./types";

// TODO: Wire to @ion/identity-client when available
export async function validateNickname(_nickname: string): Promise<ValidateNicknameResult> {
  throw new Error("validateNickname not implemented — wire to @ion/identity-client");
}
