# @ion/wallet

Wallet management business logic. Currently uses an in-memory mock store that will be replaced when a real wallet client is integrated.

## Structure

```text
src/
  types.ts                    — WalletView, WalletViewStore types
  wallet-view-store.ts        — In-memory mock store with reactive updates
  create-wallet-view.ts       — Create wallet action
  rename-wallet-view.ts       — Rename wallet action
  delete-wallet-view.ts       — Delete wallet action
  switch-wallet-view.ts       — Switch active wallet action
  use-wallet-views.ts         — Hook: subscribe to wallet list
  use-active-wallet-view.ts   — Hook: subscribe to active wallet
```

## Public API

- `WalletView` — Wallet data type
- `useWalletViews()` — Reactive wallet list hook
- `useActiveWalletView()` — Reactive active wallet hook
- `createWalletView(name)` — Create a new wallet (max 2)
- `renameWalletView(walletId, newName)` — Rename a wallet
- `deleteWalletView(walletId)` — Delete a wallet
- `switchWalletView(walletId)` — Switch active wallet

## Dependencies

None (peer: React for hooks).

## Design

Mock in-memory singleton store using `useSyncExternalStore` for reactivity. Same pattern as `identityClient.authStore`. Will be replaced by a real wallet client.
