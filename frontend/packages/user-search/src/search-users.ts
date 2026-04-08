import type { SearchUsersInput, SearchUsersResult, SearchableUser } from "./types";
import { STUB_USERS } from "./stub-users";

function filterUsersByQuery(users: readonly SearchableUser[], query: string): SearchableUser[] {
  const lowerQuery = query.toLowerCase();
  return users.filter(
    (user) =>
      user.displayName.toLowerCase().includes(lowerQuery) ||
      user.username.toLowerCase().includes(lowerQuery),
  );
}

// TODO: Wire to real API when available
export async function searchUsers(input: SearchUsersInput): Promise<SearchUsersResult> {
  const pageSize = input.pageSize ?? 10;
  const filtered = input.query ? filterUsersByQuery(STUB_USERS, input.query) : STUB_USERS;
  const start = input.page * pageSize;
  const users = filtered.slice(start, start + pageSize);
  return { users, hasMore: start + pageSize < filtered.length };
}
