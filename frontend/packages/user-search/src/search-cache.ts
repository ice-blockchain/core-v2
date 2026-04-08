import type { Database } from "@ion/storage";
import type { SearchableUser, UserSearchCacheEntry } from "./types";

const CACHE_TTL_MS = 5 * 60 * 1000;

export const USER_SEARCH_MIGRATIONS = [
  {
    version: 1,
    up: `CREATE TABLE IF NOT EXISTS user_search_cache (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      displayName TEXT NOT NULL,
      avatarUrl TEXT NOT NULL DEFAULT '',
      isVerified INTEGER NOT NULL DEFAULT 0,
      cachedAt TEXT NOT NULL
    )`,
  },
];

function mapCacheEntryToUser(entry: UserSearchCacheEntry): SearchableUser {
  return {
    id: entry.id,
    username: entry.username,
    displayName: entry.displayName,
    avatarUrl: entry.avatarUrl,
    isVerified: entry.isVerified === 1,
  };
}

export async function getCachedUsers(database: Database, query: string): Promise<SearchableUser[]> {
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const pattern = `%${query}%`;
  const rows = await database.query<UserSearchCacheEntry>(
    `SELECT * FROM user_search_cache
     WHERE (username LIKE ? OR displayName LIKE ?) AND cachedAt > ?
     ORDER BY displayName ASC LIMIT 20`,
    [pattern, pattern, cutoff],
  );
  return rows.map(mapCacheEntryToUser);
}

export async function cacheUsers(database: Database, users: SearchableUser[]): Promise<void> {
  if (users.length === 0) return;
  const now = new Date().toISOString();
  const statements = users.map((user) => ({
    sql: `INSERT OR REPLACE INTO user_search_cache (id, username, displayName, avatarUrl, isVerified, cachedAt)
          VALUES (?, ?, ?, ?, ?, ?)`,
    params: [user.id, user.username, user.displayName, user.avatarUrl, user.isVerified ? 1 : 0, now],
  }));
  await database.executeBatch(statements);
}
