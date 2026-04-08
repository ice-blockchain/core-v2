# Profile UI

Profile screen package for the mobile app. Displays user profile information, followers/following counts, bio, and tabbed content (Posts, Replies, Videos, Articles) with empty states.

## Data Structures

- `ProfileData` -- user metadata type: displayName, username, bio, avatar, followers, etc.
- `TabPageConfig` -- per-tab config: key, empty state image, translation keys
- Mock data used for initial implementation; will be replaced by API integration.

## API Surface

- `ProfileScreen` -- main screen component, renders the full profile layout
- `profileTranslations` -- i18n resource array (en/fr/de)
- `PROFILE_NAMESPACE` -- translation namespace constant

## Dependencies

- `@ion/ui` -- AnimatedTabBar, AnimatedTabPager, useTabViewState, Text, Icon, HorizontalSeparator, useTheme
- `@ion/localization` -- translate(), TranslationResource
- `react-native-pager-view` -- native horizontal page swiping (via @ion/ui)
- `react-native-reanimated` -- scroll animations, shared values

## Design Decisions

- Tab system uses `AnimatedTabBar` + `AnimatedTabPager` from `@ion/ui` with a shared `SharedValue<number>` position driving indicator animation, color cross-fade, and page transitions
- Multi-color empty state illustrations stored as PNG assets (not SVG icons) because the icon generator replaces all colors with a single prop
- Header scroll and tab pager are currently independent (not nested). When real scrollable tab content is added, the layout will need coordinated nested scrolling (collapsible header pins tab bar, inner scroll collapses header first). This is a known architectural debt.
- Each tab page stays mounted (PagerView default) preserving scroll position and loaded state
