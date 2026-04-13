# @ion/wallet

Wallet domain actions, reactive stores, and data converters. Actions layer: wraps `@ion/identity-client` for wallet-view CRUD, with optimistic updates and ActionError translation.

## Structure

```text
src/
  types.ts                              — WalletView, CoinsGroup, CoinWithBalance, CoinDisplayInfo, WalletViewData
  errors.ts                             — WalletErrorCode enum; re-exports ActionError from @ion/diagnostics
  error-messages.ts                     — buildWalletActionError (maps code -> translated userMessage)

  actions/
    create-wallet-view.ts               — Create wallet view with optimistic update + revert on failure
    rename-wallet-view.ts               — Rename wallet view with optimistic update + revert on failure
    delete-wallet-view.ts               — Delete wallet view with optimistic update + revert on failure
    switch-wallet-view.ts               — Switch active wallet view (local only)
    load-wallet-view-data.ts            — Load all wallet views at startup, in parallel

  stores/
    wallet-view-store.ts                — In-memory store with useSyncExternalStore reactivity
    wallet-client-config.ts             — Module-level singleton for identity-client + username

  converters/
    convert-wallet-view.ts              — Map identity-client WalletViewDetail -> WalletViewData
    extract-contract-address.ts         — Parse contract address from coin ref
    search-aggregation-item.ts          — Find matching aggregation item by symbol
    compare-coin-groups.ts              — Sort CoinsGroup collection
    compare-coins.ts                    — Sort coins within a group
    coin-sort-utils.ts                  — Priority-list comparator for symbol groups
    from-blockchain-units.ts            — Convert raw bigint-string to decimal number
    format-usd.ts                       — Shared USD balance formatter

  hooks/
    use-wallet-views.ts                 — Subscribe to wallet list
    use-active-wallet-view.ts           — Subscribe to active wallet
```

## Public API

Types:
- `WalletView`, `CoinsGroup`, `CoinWithBalance`, `CoinDisplayInfo`

Hooks:
- `useWalletViews()` — reactive wallet list
- `useActiveWalletView()` — reactive active wallet

Actions:
- `createWalletView(name)` — max 2 wallet views; returns Promise that resolves after server roundtrip
- `renameWalletView(walletId, newName)` — optimistic rename, reverts on server error
- `deleteWalletView(walletId)` — optimistic delete, reverts on server error
- `switchWalletView(walletId)` — synchronous; throws ActionError if not found
- `loadWalletViewData()` — loads all views in parallel, marks loading during fetch

Config:
- `initializeWalletClient(identityClient, username)` — must be called before any action
- `resetWalletClient()` — clears client + resets store (used on sign-out)

Errors:
- `ActionError` (re-exported from `@ion/diagnostics`)
- `WalletErrorCode` — enum used for `ActionError.code`
- `MAX_WALLET_VIEWS` — limit constant

## Dependencies

- `@ion/diagnostics` — `Logger`, `ActionError`
- `@ion/identity-client` — server-side wallet API client + types
- `@ion/localization` — translated user-facing error messages
- React (peer) — hooks

## Design

- Stores follow the same module-level singleton + `useSyncExternalStore` pattern as `identityClient.authStore`.
- Every action validates synchronously, applies an optimistic mutation, calls the server, and reverts on failure while logging via `Logger.error` with `tag: "wallet"`.
- Package-internal errors are translated into `ActionError` (from `@ion/diagnostics`) with a `WalletErrorCode` code and a translated `userMessage`. Screens never see transport-layer errors.
- `wallet-client-config` is a module-level singleton rather than a React context so non-React call sites (actions triggered from app shell) can invoke it.
- USD formatting is shared via `converters/format-usd.ts` to avoid re-instantiating `Intl.NumberFormat` across actions.
