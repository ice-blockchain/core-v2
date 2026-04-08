# Wallet UI

Pure UI package for the wallet tab screen — components, translations, assets. No business logic.

## Structure

```
src/
  screens/       — WalletScreen (main wallet tab)
  components/    — Reusable wallet UI components
  assets/        — Raster images (portfolio banner, empty coins)
  translations/  — i18n strings (en, fr, de)
  types.ts       — Shared types (ContactData, CoinTabKey)
  index.ts       — Public API
```

## Public API

- `WalletScreen` — Main wallet tab screen component
- `walletUiTranslations` — Translation resources for registration
- `WALLET_UI_NAMESPACE` — Translation namespace identifier

## Dependencies

- `@ion/ui` — Design system primitives (Text, Icon, Avatar, useTheme, colorPalette)
- `@ion/localization` — Translation system (translate, TranslationResource)

## Design

Static/UI-only implementation from Figma. All data is hardcoded (mock contacts, zero balance). Action buttons are visual placeholders with no navigation wiring. All visual primitives come from `@ion/ui`. No hardcoded colors, fonts, or spacing.
