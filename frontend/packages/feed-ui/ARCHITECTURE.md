# @ion/feed-ui

UI package for feed-related screens and components.

## Data Structures
- No domain models yet — this package is UI-only.

## API Surface
- `CreatePostSheetScreen` — Sheet screen for the "New post" composer.
- `feedTranslations` / `FEED_NAMESPACE` — i18n resources for feed UI strings.

## Dependencies
- `@ion/ui` — design system components, icons, theme
- `@ion/navigation` — Sheet, routes, navigation hooks
- `@ion/localization` — translate()

## Design Decisions
- Uses the existing `Sheet` component from `@ion/navigation` (92% snap) for consistency with auth flow.
- All strings go through `@ion/localization` with en/fr/de support.
- Components are pure UI with no business logic — ready for action layer wiring later.
