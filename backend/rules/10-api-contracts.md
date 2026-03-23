---
paths:
  - "packages/*-client/**/*"
  - "services/*/controller.ts"
  - "services/*/routes.ts"
  - "shared/types/api-contracts/**/*"
---

# API Contract Rules

## The Bridge Between Repos

`@ion/api-contracts` is a shared npm package (private registry) that defines the typed interface between ion-app and ion-backend. Both repos install it as a dependency.

```
@ion/api-contracts/
  src/
    wallet.ts        # WalletBalance, TransferRequest, TransferResponse
    feed.ts          # FeedPost, CreatePostRequest, FeedFilters
    chat.ts          # ChatMessage, SendMessageRequest
    identity.ts      # User, AuthTokens, LoginRequest
    common.ts        # Pagination, ErrorResponse, ApiResponse<T>
  package.json
```

---

## Rules

### CRITICAL: No endpoint is called without a typed contract.
Every API call between app and backend has a corresponding type definition in `@ion/api-contracts`. No ad-hoc `fetch()` calls with untyped responses.

### CRITICAL: No `any` on API boundaries.
Request types, response types, and error types are all fully typed. If the backend changes a response shape, the app must fail at compile time — not at runtime.

### CRITICAL: String for monetary amounts.
Never use `number` for money, balances, or token amounts. Use `string` to avoid floating point precision issues.

```typescript
// BAD
interface TransferRequest {
  amount: number;   // 0.1 + 0.2 !== 0.3
}

// GOOD
interface TransferRequest {
  amount: string;   // "0.30" — precise, no floating point
}
```

### IMPORTANT: Backend is the source of truth for contracts.
When adding a new endpoint:
1. Define the types in `@ion/api-contracts` first
2. Implement the backend endpoint using those types
3. Implement the mobile action using those same types
4. Publish a new version of `@ion/api-contracts`

### IMPORTANT: Breaking changes require a version bump.
If a contract type changes shape (field added, removed, or renamed), bump the package version. Both repos must update to the new version in the same release cycle.

---

## Example

```typescript
// @ion/api-contracts/src/wallet.ts

export interface WalletBalance {
  userId: string;
  coins: CoinBalance[];
  totalUsd: string;
  updatedAt: string;
}

export interface TransferRequest {
  fromUserId: string;
  toUserId: string;
  coinId: string;
  amount: string;
}

export interface TransferResponse {
  transactionId: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
}

// Backend uses these as response types
// Mobile uses these as expected types from API calls
// If backend changes the shape, both break at compile time
```
