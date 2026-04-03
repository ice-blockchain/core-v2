# identity-client

Off-chain account management client for the ION Identity service. Handles registration, login (password + passkey), session management, token refresh, credentials, 2FA, account recovery, account deletion, and user action signing.

## Public API

Factory: `createIdentityClient(config)` returns `IdentityClient`.

Convenience factory: `createDefaultIdentityClient(config)` returns `IdentityClient`. Requires `secureStorage: ISecureStorage`. Optionally accepts `baseUrl` and `appId` (default from `@ion/config`).

```text
IdentityClientConfig {
  secureStorage: ISecureStorage  -- from @ion/storage
  baseUrl: string                -- Identity API base URL
  appId: string                  -- application identifier (used as origin + X-Client-ID)
  nativePbkdf2?: Pbkdf2Fn       -- optional native PBKDF2 for React Native performance
}
```

The client creates its own `HttpClient` internally with the auth interceptor baked in. Consumers do not provide an `httpClient`.

### Methods

| Method | Description |
|--------|-------------|
| `registerWithPasskey(username, email?)` | Register via platform passkey (Fido2) |
| `registerWithPassword(input)` | Register via Ed25519 key encrypted with password |
| `loginWithPasskey(username, twoFACodes?)` | Login via passkey assertion |
| `loginWithPassword(input)` | Login by decrypting stored key and signing challenge |
| `logout(username)` | Clear tokens locally + server-side, remove from authStore |
| `refreshToken(username)` | Refresh access token using refresh token |
| `isAuthenticated(username)` | Check if stored token exists and is not expired |
| `restoreAuth()` | Restore authStore from persisted tokens on app start |
| `getLoginCapabilities(username)` | Query which auth methods a user supports |
| `getUser(username, userIdOrMasterKey)` | Fetch user profile data |
| `getSocialProfile(username, userIdOrMasterKey)` | Fetch social profile (displayName, avatar, bio, referral) |
| `updateSocialProfile(username, userId, input)` | Update social profile fields |
| `verifyNickname(username, nickname)` | Check if nickname is available |
| `verifyEarlyAccessEmail(email)` | Verify early access email |
| `listCredentials(username)` | List user's registered credentials |
| `createRecoveryCredentials(username, signingContext)` | Create recovery key pair + recovery code |
| `requestTwoFACode(params)` | Request 2FA verification code (SMS, email, TOTP) |
| `verifyTwoFACode(params)` | Verify 2FA code |
| `deleteTwoFAMethod(input)` | Delete a 2FA method |
| `deleteAccount(username, userAction)` | Delete account (caller provides signed event) |
| `recoverAccount(input)` | Recover account using recovery credentials |
| `authStore` | Reactive auth state store (getSnapshot, subscribe) |

### AuthStore

Reactive store exposing authorized usernames. Compatible with React `useSyncExternalStore`.

```typescript
interface AuthStore {
  getSnapshot(): readonly string[];
  subscribe(onStoreChange: () => void): () => void;
}
```

Login/register adds username. Logout/delete/token-clear removes username. Listeners fire on every mutation.

## Architecture

### Auth Interceptor

A centralized `Interceptor` at the HTTP client level replaces per-call auth wrappers:

- **`onRequest`**: Reads `X-Username` header, looks up token via `TokenManager`, injects `Authorization: Bearer <token>`. Skips if `Authorization` already set (registration/recovery temp tokens, refresh endpoint).
- **`onResponse`**: Cleans up internal request-to-username tracking map.
- **`onError`**: On `AUTH_EXPIRED`, identifies the user from the tracking map, calls deduplicated refresh, returns `shouldRetry: true` so the HTTP client retries with the fresh token.

Data sources only set `X-Username` header. The interceptor handles all token injection and refresh.

### User Action Signing

Protected operations (credential creation, 2FA changes, account deletion) require a signed user action:

1. `POST /auth/action/init` with the request body to sign
2. Server returns a challenge
3. Client signs with password-decrypted key or passkey
4. `POST /auth/action` with the signed challenge
5. Server returns a `userAction` token
6. Original request includes `X-Useraction` header

### Orchestrator Pattern

Each operation is an orchestrator function that reads like a recipe and delegates to named sub-functions. Orchestrators receive deps via dependency injection; the factory wires everything.

## Data Structures

```typescript
AuthTokens { token: string; refreshToken: string }

LoginCapabilities {
  supportsPasskey: boolean
  supportsPassword: boolean
  identityFound: boolean
  twoFAOptionsCount: number | null
}

User {
  masterPubKey: string
  email: string[] | null
  phoneNumber: string[] | null
  '2faOptions': TwoFAOption[] | null
  ionConnectRelays: UserAssignedRelay[] | null
  ionConnectIndexerRelays: string[] | null
  duplicateOf: string | null
}

SigningContext = { kind: 'password'; password: string } | { kind: 'passkey' }

IdentityError extends Error {
  code: IdentityErrorCode
  cause?: unknown
}

SocialProfile {
  username: string | null
  displayName: string | null
  avatar: string | null
  bio: string | null
  referral: string | null
  referralMasterKey: string | null
  referralCount: number
}

IdentityErrorCode:
  PASSKEY_NOT_AVAILABLE | PASSKEY_CANCELLED | PASSKEY_VALIDATION_FAILED
  INVALID_CREDENTIALS | USER_NOT_FOUND | USER_ALREADY_EXISTS
  USER_DEACTIVATED | TOKEN_EXPIRED | UNAUTHENTICATED
  INVALID_RECOVERY_CREDENTIALS | NETWORK_ERROR | UNKNOWN
  INVALID_NICKNAME | NICKNAME_ALREADY_EXISTS | NICKNAME_RESERVED

EncryptedPrivateKey { salt: string; nonce: string; ciphertext: string; mac: string }
  -- base64-encoded. PBKDF2 (100k iterations, SHA256) + AES-GCM-256.
```

## Data Flow

### Registration (password)
```text
registerWithPassword(input)
  -> POST /auth/registration/delegated { email: username }
  <- UserRegistrationChallenge { challenge, temporaryAuthenticationToken }
  -> generateKeyPair() -> Ed25519 seed + public key
  -> signForRegistration() -> credId, clientData, attestationData, encryptedPrivateKey
  -> POST /auth/registration/enduser (Authorization: Bearer {tempToken})
  <- RegistrationResult { authentication: { token, refreshToken }, user: { id } }
  -> tokenManager.setTokens(username, tokens)
  -> authStore.addUser(username)
```

### Login (password)
```text
loginWithPassword(input)
  -> POST /auth/login/init { username }
  <- UserActionChallenge { challenge, allowCredentials.passwordProtectedKey[].encryptedPrivateKey }
  -> decryptPrivateKey(encryptedPrivateKey, password) -- PBKDF2 + AES-GCM
  -> signForLogin() -> credId, clientData, signature
  -> POST /auth/login { challengeIdentifier, firstFactor: { kind: "PasswordProtectedKey", credentialAssertion } }
  <- AuthTokens
  -> tokenManager.setTokens + authStore.addUser
```

### Logout
```text
logout(username)
  -> PUT /auth/logout (X-Username: {username}) -- interceptor adds Authorization
  -> tokenManager.clearTokens(username)
  -> authStore.removeUser(username)
```

### Token Refresh (interceptor-driven)
```text
Any authenticated request returns 401:
  -> interceptor.onError detects AUTH_EXPIRED
  -> deduplicatedRefresh(username)
     -> POST /auth/login/delegated { refreshToken } (explicit Authorization with current token)
     <- new AuthTokens
     -> tokenManager.setTokens
  -> interceptor returns shouldRetry: true
  -> HTTP client retries request with fresh token
```

### Account Recovery
```text
recoverAccount(input)
  -> POST /auth/recover/user/delegated { username, credentialId }
  <- UserRegistrationChallenge with allowedRecoveryCredentials
  -> decryptPrivateKey(encryptedRecoveryKey, recoveryCode)
  -> build new credential (password or passkey) using challenge
  -> signForLogin with recovery key, signing base64url(JSON(newCredentials))
  -> POST /auth/recover/user (Authorization: Bearer {tempToken})
  -- Does NOT store tokens. User must login separately after recovery.
```

### Account Deletion (NOT YET FUNCTIONAL)
```text
deleteAccount(username, userAction)
  -> extract userId from stored JWT
  -> DELETE /auth/users/{userId}
     headers: X-Username, X-Useraction: {userAction}
  -> tokenManager.clearTokens + authStore.removeUser
```
The `userAction` parameter must be a base64-encoded Nostr Kind 5 (deletion) event,
created by the caller (app/actions layer). The identity-client does not create this event.

Known issue: the actions layer does not yet produce the Nostr Kind 5 event for TypeScript.
Until that is implemented, `deleteAccount` cannot be called successfully.

## Data Sources

| Data Source | Endpoints |
|-------------|-----------|
| `login-data-source` | `/auth/login/init`, `/auth/login` |
| `registration-data-source` | `/auth/registration/delegated`, `/auth/registration/enduser` |
| `session-data-source` | `/auth/login/delegated`, `/auth/logout` |
| `user-data-source` | `/auth/users/{id}` |
| `credentials-data-source` | `/auth/credentials`, `/auth/credentials/init` |
| `two-fa-data-source` | `/auth/2fa/*` |
| `user-action-data-source` | `/auth/action/init`, `/auth/action` |
| `recovery-data-source` | `/auth/recover/init`, `/auth/recover/user` |
| `user-profile-data-source` | `/v1/users/{id}/profiles/social`, `/v1/users/verify-username-availability` |
Data sources are thin HTTP wrappers. They set `X-Username` header; the interceptor injects `Authorization`.

## Dependencies

| Package | Usage |
|---------|-------|
| `@ion/config` | `environmentConfig` for default client factory |
| `@ion/network` | `HttpClient`, `Interceptor`, `NetworkError` |
| `@ion/storage` | `ISecureStorage` for token persistence |
| `@ion/diagnostics` | `Logger` for error logging |
| `@noble/curves` | Ed25519 signatures |
| `@noble/hashes` | SHA256, PBKDF2 |
| `@noble/ciphers` | AES-GCM encryption |
| `@scure/base` | Base64, base64url encoding/decoding |
| `json-stable-stringify` | Canonical JSON serialization for signing |
| `react-native-passkey` | Native passkey support (peer, optional) |

## Design Decisions

- **Client owns its HTTP stack.** Config takes `baseUrl` + `appId`, not a pre-built `httpClient`. The auth interceptor is baked in at creation time.
- **Auth interceptor replaces per-call withAuthRetry.** Centralized token injection and refresh at the HTTP layer. Data sources never touch tokens.
- **X-Username header pattern.** Data sources set `X-Username`; interceptor reads it to look up the correct user's token. Skips when `Authorization` already exists (temp tokens, refresh).
- **Reactive AuthStore.** `getSnapshot()` + `subscribe()` pattern compatible with React `useSyncExternalStore`. Login adds, logout/delete removes.
- **Recovery does not auto-login.** `recoverAccount` discards returned tokens. User must login separately.
- **PBKDF2 injectable via DI.** `nativePbkdf2` config option replaces the previous `globalThis` hook for React Native performance.
- **Token storage is opaque.** Tokens stored via `ISecureStorage`. Package never exposes raw tokens.
- **Credential signing uses Ed25519 with PEM encoding.** Private keys encrypted with PBKDF2+AES-GCM before sending to server.
- **Platform-split passkey.** `platform/passkey.web.ts` and `platform/passkey.native.ts` follow the triple-file pattern.

## React Native Requirements

When using in React Native, the consuming app must provide polyfills before importing:
- `react-native-get-random-values` (crypto.getRandomValues)
- `text-encoding-polyfill` (TextEncoder/TextDecoder)
- `react-native-passkey` (for passkey support)
