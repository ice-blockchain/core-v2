# @ion/user-search

Action layer package for user search and follower list functionality.

## Layer

Actions — sits above Clients, below UI.

## Data Structures

- **SearchableUser**: Core user type with `id`, `username`, `displayName`, `avatarUrl`, `isVerified`
- **SearchUsersInput/Result**: Paginated search query and response
- **FetchFollowedUsersInput/Result**: Paginated follower list query and response
- **UserSearchCacheEntry**: SQLite row for cached search results

## API Surface

| Function | Purpose |
|---|---|
| `searchUsers(input)` | Search users by name or username (paginated) |
| `fetchFollowedUsers(input)` | Fetch followed users for initial state (paginated) |
| `getCachedUsers(db, query)` | Read cached search results from SQLite |
| `cacheUsers(db, users)` | Write search results to SQLite cache |
| `USER_SEARCH_MIGRATIONS` | SQLite migration for cache table |

## Dependencies

- `@ion/storage` — Database types for SQLite caching

## Design Decisions

- **Stub data**: Both `searchUsers` and `fetchFollowedUsers` use hardcoded stub data until the backend API is available. The interface is production-ready.
- **Cache layer**: SQLite cache with 5-minute TTL enables offline search and reduces API calls. Cache is opt-in — callers must provide a `Database` instance.
- **Pagination**: Page-based (not cursor-based) to match the backend pattern used in `@ion/onboarding`.
