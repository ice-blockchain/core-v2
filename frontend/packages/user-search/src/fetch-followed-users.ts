import type { FetchFollowedUsersInput, FetchFollowedUsersResult } from "./types";
import { STUB_USERS } from "./stub-users";

const STUB_FOLLOWED_USERS = STUB_USERS.slice(0, 30);

// TODO: Wire to real API when available
export async function fetchFollowedUsers(input: FetchFollowedUsersInput): Promise<FetchFollowedUsersResult> {
  const pageSize = input.pageSize ?? 10;
  const start = input.page * pageSize;
  const users = STUB_FOLLOWED_USERS.slice(start, start + pageSize);
  return { users, hasMore: start + pageSize < STUB_FOLLOWED_USERS.length };
}
