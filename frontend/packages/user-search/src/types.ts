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

export interface SearchableUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isVerified: boolean;
}

export interface SearchUsersInput {
  query: string;
  page: number;
  pageSize?: number;
}

export interface SearchUsersResult {
  users: SearchableUser[];
  hasMore: boolean;
}

export interface FetchFollowedUsersInput {
  page: number;
  pageSize?: number;
}

export interface FetchFollowedUsersResult {
  users: SearchableUser[];
  hasMore: boolean;
}

export interface UserSearchCacheEntry {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isVerified: number;
  cachedAt: string;
}
