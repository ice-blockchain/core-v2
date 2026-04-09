# Wallet UI

UI package for the wallet tab screen — components, translations, assets. Includes the wallet-view management flow (switcher, manage, create, edit, delete) rendered inside a single dynamically-sized bottom sheet.

## Structure

```text
src/
  screens/
    WalletScreen.tsx              — Main wallet tab screen
    wallet-view-management/       — Wallet-view management flow screens
      WalletViewSwitcherScreen.tsx
      ManageWalletViewsScreen.tsx
      CreateWalletViewScreen.tsx
      EditWalletViewScreen.tsx
      DeleteWalletViewConfirmScreen.tsx
  components/    — Shared wallet-tab components (list items, forms, header, coins, banners)
  assets/        — Raster images (portfolio banner, empty coins, wallet delete)
  translations/  — i18n strings (en, fr, de)
  types.ts       — Shared types (ContactData, CoinTabKey)
  index.ts       — Public API
```

## Public API

- `WalletScreen` — Main wallet tab screen
- `WalletViewSwitcherScreen` — Switcher screen (plugged into `walletViewScreens.Switcher`)
- `ManageWalletViewsScreen` — Manage screen (plugged into `walletViewScreens.Manage`)
- `CreateWalletViewScreen` — Create screen (plugged into `walletViewScreens.Create`)
- `EditWalletViewScreen` — Edit screen (plugged into `walletViewScreens.Edit`)
- `DeleteWalletViewConfirmScreen` — Delete confirmation screen (plugged into `walletViewScreens.DeleteConfirm`)
- `walletUiTranslations`, `WALLET_UI_NAMESPACE` — i18n registration

The five wallet-view management screens are plain content — they never wrap themselves in a sheet. The single `DynamicSheet` lives in `@ion/navigation`'s `WalletViewSheetNavigator`, which is registered once on the root stack under `Sheet/WalletViewManagement`.

## Dependencies

- `@ion/ui` — Design primitives (Text, Icon, Button, TextField, useTheme, colorPalette)
- `@ion/localization` — `translate`, `TranslationResource`
- `@ion/wallet` — Wallet-view business logic (store, CRUD actions, hooks)
- `@ion/navigation` — `DynamicSheet`, `WalletViewSheetNavigator`, `useWalletViewNavigation`, `Routes`, `WalletViewSheetParamList`

## Design

The wallet-view management flow is mounted by a single root-level `Sheet/WalletViewManagement` `transparentModal` route. That route renders `WalletViewSheetNavigator`, which wraps **one persistent `DynamicSheet`** (gorhom `BottomSheet`, `enableDynamicSizing`) around a **custom nested navigator** (`createDynamicStackNavigator` in `@ion/navigation`). The custom navigator is built on React Navigation v7's public `useNavigationBuilder` + `StackRouter` API and renders **only the focused descriptor inline** via `descriptors[route.key].render()`. Because the focused screen is a regular JSX child (no absolute positioning, no `flex: 1` collapse), `BottomSheetView` can measure its intrinsic height via `onLayout` and `@gorhom/bottom-sheet` animates its snap point smoothly between heights whenever the user navigates.

Transitions use standard `navigate` / `goBack` semantics. The `useWalletViewNavigation()` hook exposes typed methods (`openManage`, `openCreate`, `openEdit`, `openDeleteConfirm`, `goBack`, `goToSwitcher`, `closeSheet`). Screens call these methods and never touch `StackActions` or route names directly.

- `goBack()` pops one frame (used after create success, rename success, and Cancel on delete confirmation).
- `goToSwitcher()` dispatches `StackActions.popToTop()` (used after a successful delete so the user lands on the Switcher inside the same sheet, not ejected).
- `closeSheet()` walks up via `navigation.getParent()` and calls root `goBack()` to exit the whole flow. Close-button and backdrop taps call `sheetRef.current?.close()` on the underlying `BottomSheet` so the sheet plays its dismiss animation first, and the resulting `onChange(-1)` then triggers `goBack()` — this matches the smooth swipe-down dismiss.

Sheet-header state (title, back button visibility) is driven by `screenListeners={{ state }}` on the nested navigator: the current focused route name maps to a `{ title, showClose, showBack }` tuple that `WalletViewSheetNavigator` passes to `DynamicSheet`. The delete confirmation screen is rendered header-less and non-dismissable to match the Figma dialog styling.

**Why a custom navigator?** React Navigation's `createNativeStackNavigator` container uses `absoluteFill`, so it has no intrinsic height — wrapping it in `DynamicSheet` collapses the sheet to zero. Five separate `transparentModal` routes cause a flash on every transition (the old sheet and backdrop unmount, the new one runs its mount animation). A state-machine view switcher puts navigation state outside React Navigation, violating `.claude/rules/05-frontend-ui.md`. A custom navigator built with `useNavigationBuilder(StackRouter, ...)` satisfies pixel-perfect dynamic sizing, single-sheet mounting, React-Navigation-based navigation, and smooth height animation simultaneously.
