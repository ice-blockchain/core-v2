# @ion/user-search-ui

UI layer package for user search components. Provides a reusable search list that can be embedded in multiple screens (new chat, mentions, share, etc.).

## Layer

UI Features — sits at the App/Screen level, imports from Actions.

## Components

| Component | Purpose |
|---|---|
| `UserSearchList` | Full search experience: optional search field + scrollable user list with pagination |
| `UserSearchRow` | Single user row: avatar, display name, verified badge, username handle |

## Props

### UserSearchList
- `showSearchField?: boolean` — Toggle search input visibility (default: `true`)
- `onSelectUser?: (user) => void` — Callback when a user row is tapped
- `testID?: string`

### UserSearchRow
- `user: SearchableUser` — User data to display
- `onPress?: (user) => void` — Tap handler
- `testID?: string`

## Dependencies

- `@ion/user-search` — Action layer for search/follower data
- `@ion/ui` — Design system components (SearchBar, Text, Icon, useTheme)
- `@ion/media-viewer` — MediaImage for avatars
- `@ion/localization` — Translated strings

## Translations

Namespace: `userSearch`. Supported locales: `en`, `fr`, `de`.

## Design Decisions

- **Debounced search**: 300ms debounce on text input to avoid excessive API calls.
- **Follower default**: When search field is empty, shows followed users as the initial state.
- **Composable**: `showSearchField` flag allows embedding just the list without the search bar.
- **FlatList**: Uses React Native FlatList with `onEndReached` for infinite scroll pagination.
