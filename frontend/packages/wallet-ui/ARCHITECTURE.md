# Wallet UI

UI package for the wallet tab screen — components, translations, assets. Includes wallet management flow (switcher, create, edit, delete) via a bottom sheet.

## Structure

```
src/
  screens/       — WalletScreen (main wallet tab)
  components/    — Wallet UI components including WalletViewsSheet and sub-views
  assets/        — Raster images (portfolio banner, empty coins, wallet delete)
  translations/  — i18n strings (en, fr, de)
  types.ts       — Shared types (ContactData, CoinTabKey)
  index.ts       — Public API
```

## Public API

- `WalletScreen` — Main wallet tab screen component
- `walletUiTranslations` — Translation resources for registration
- `WALLET_UI_NAMESPACE` — Translation namespace identifier

## Dependencies

- `@ion/ui` — Design system primitives (Text, Icon, Button, TextField, BottomSheet, useTheme, colorPalette)
- `@ion/localization` — Translation system (translate, TranslationResource)
- `@ion/wallet` — Wallet management business logic (mock store, CRUD actions, hooks)

## Design

Wallet header pill opens a BottomSheet with multi-view navigation (switcher, manage, create, edit, delete confirmation). State machine managed via useState in WalletViewsSheet. All visual primitives from `@ion/ui`. No hardcoded colors, fonts, or spacing.
