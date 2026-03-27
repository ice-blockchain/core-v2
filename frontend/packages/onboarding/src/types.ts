export class ActionError extends Error {
  code: string;
  userMessage: string;

  constructor(code: string, userMessage: string) {
    super(userMessage);
    this.code = code;
    this.userMessage = userMessage;
    this.name = "ActionError";
  }
}

export interface SaveProfileInput {
  displayName: string;
  nickname: string;
  referredBy?: string | undefined;
}

export interface SaveProfileResult {
  success: boolean;
}

export interface UploadAvatarInput {
  imageUri: string;
}

export interface UploadAvatarResult {
  avatarUrl: string;
}

export interface ValidateNicknameResult {
  isAvailable: boolean;
  isReserved: boolean;
}

export interface ValidateReferralResult {
  isValid: boolean;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export type FetchLanguagesResult = Language[];

export interface SaveSelectedLanguagesInput {
  languageCodes: string[];
}

export interface Creator {
  id: string;
  avatarUrl: string;
  name: string;
  handle: string;
  isVerified: boolean;
}

export interface FetchSuggestedCreatorsInput {
  page: number;
}

export interface FetchSuggestedCreatorsResult {
  creators: Creator[];
  hasMore: boolean;
}
