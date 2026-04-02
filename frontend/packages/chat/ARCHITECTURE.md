# Chat

Chat/messaging feature package — screens, components, and logic.

## Structure

```
src/
  screens/       — Full chat screens (conversation list, chat thread, etc.)
  components/    — Reusable chat UI components (message bubble, input bar, etc.)
  translations/  — i18n strings for chat
  types.ts       — Shared types
  index.ts       — Public API
```

## Dependencies

- `@ion/ui` — Design system primitives (Text, Button, Icon, theme)
- `@ion/localization` — Translation system

## Design

Screens are implemented from Figma designs using the Figma MCP server. All visual primitives come from `@ion/ui`. No hardcoded colors, fonts, or spacing.
