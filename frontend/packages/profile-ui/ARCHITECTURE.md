# Profile UI

Profile screen package for the mobile app. Displays user profile information, followers/following counts, bio, and tabbed content (Posts, Replies, Videos, Articles) with empty states.

## Data Structures

- `ProfileData` — user metadata type: displayName, username, bio, avatar, followers, etc.
- Mock data used for initial implementation; will be replaced by API integration.

## API Surface

- `ProfileScreen` — main screen component, renders the full profile layout
- `profileTranslations` — i18n resource array (en/fr/de)
- `PROFILE_NAMESPACE` — translation namespace constant

## Dependencies

- `@ion/ui` — Avatar, SmallButton, Text, Icon, HorizontalSeparator, VerticalSeparator, useTheme
- `@ion/localization` — translate(), TranslationResource

## Design Decisions

- Tab bar is a generic reusable component (`ProfileTabBar`) — not profile-specific logic
- Multi-color empty state illustrations stored as PNG assets (not SVG icons) because the icon generator replaces all colors with a single prop
- Collapsing header deferred to a follow-up; current layout uses a static ScrollView
- Tab switching is state-based (no swipe library); swipe can be layered on later
