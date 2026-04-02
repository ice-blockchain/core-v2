# identity-client

Off-chain account management client for the ION Identity service. Handles user registration, login (password + passkey), session management, and user data retrieval.

## Public API

Factory: `createIdentityClient(config)` returns `IdentityClient`.

Convenience factory: `createDefaultIdentityClient(config)` returns `IdentityClient`. Requires `secureStorage: ISecureStorage`. Optionally accepts `httpClient` (defaults to `@ion/network` client) and `appId` (defaults to `@ion/config` value).

```text
IdentityClientConfig {
  httpClient: HttpClient       -- from @ion/network
  secureStorage: ISecureStorage -- from @ion/storage
  appId: string                 -- application identifier (used as origin for signing)
}
```

### Methods

| Method | Description |
|--------|-------------|
| `registerWithPasskey(username)` | Register via platform passkey (Fido2) |
| `registerWithPassword(username, password)` | Register via Ed25519 key encrypted with password |
| `loginWithPasskey(username)` | Login via passkey assertion |
| `loginWithPassword(username, password)` | Login by decrypting stored key and signing challenge |
| `logout(username)` | Clear tokens locally + server-side |
| `refreshToken(username)` | Refresh access token using refresh token |
| `isAuthenticated(username)` | Check if stored token exists and is not expired |
| `getLoginCapabilities(username)` | Query which auth methods a user supports |
| `getUser(username, userIdOrMasterKey)` | Fetch user profile data |

## Data Structures

```typescript
AuthTokens { token: string; refreshToken: string }

LoginCapabilities {
  supportsPasskey: boolean
  supportsPassword: boolean
  identityFound: boolean
}

User {
  masterPubKey: string
  email: string[] | null
  phoneNumber: string[] | null
  '2faOptions': TwoFAOption[] | null          -- 'sms' | 'email' | 'totp_authenticator'
  ionConnectRelays: UserAssignedRelay[] | null -- { type, url }
  ionConnectIndexerRelays: string[] | null
  duplicateOf: string | null
}

IdentityError extends Error {
  code: IdentityErrorCode    -- PASSKEY_NOT_AVAILABLE | PASSKEY_CANCELLED | PASSKEY_VALIDATION_FAILED
                             -- INVALID_CREDENTIALS | USER_NOT_FOUND | USER_ALREADY_EXISTS
                             -- USER_DEACTIVATED | TOKEN_EXPIRED | UNAUTHENTICATED
                             -- NETWORK_ERROR | UNKNOWN
  cause?: unknown
}

EncryptedPrivateKey { salt: string; nonce: string; ciphertext: string; mac: string }
-- All fields are base64-encoded. PBKDF2 (100k iterations, SHA256) + AES-GCM-256.
```

## Data Flow

### Registration (password)
```text
registerWithPassword(username, password)
  -> POST /auth/registration/delegated { email: username }
  <- UserRegistrationChallenge { challenge, temporaryAuthenticationToken }
  -> generateKeyPair() -> Ed25519 seed + public key
  -> signForRegistration() -> credId, clientData, attestationData, encryptedPrivateKey
  -> POST /auth/registration/enduser { firstFactorCredential: { credentialKind: "PasswordProtectedKey", ... } }
     Authorization: Bearer {temporaryAuthenticationToken}
  <- RegistrationResult { authentication: { token, refreshToken }, user: { id } }
  -> tokenManager.setTokens(username, tokens)
```

### Registration (passkey)
```text
registerWithPasskey(username)
  -> POST /auth/registration/delegated { email: username }
  <- UserRegistrationChallenge (includes rp, user, challenge, pubKeyCredParams)
  -> Passkey.create() (platform WebAuthn API)
  -> POST /auth/registration/enduser { firstFactorCredential: { credentialKind: "Fido2", credentialInfo: { credId, clientData, attestationData } } }
  <- RegistrationResult with tokens
```

### Login (password)
```text
loginWithPassword(username, password)
  -> POST /auth/login/init { username }
  <- UserActionChallenge { challenge, challengeIdentifier, allowCredentials.passwordProtectedKey[].encryptedPrivateKey }
  -> decryptPrivateKey(encryptedPrivateKey, password)
  -> signForLogin() -> credId, clientData, signature
  -> POST /auth/login { challengeIdentifier, firstFactor: { kind: "PasswordProtectedKey", credentialAssertion } }
  <- AuthTokens { token, refreshToken }
```

### Login (passkey)
```text
loginWithPasskey(username)
  -> POST /auth/login/init { username }
  <- UserActionChallenge (includes allowCredentials.webauthn)
  -> Passkey.get() (platform WebAuthn API)
  -> POST /auth/login { challengeIdentifier, firstFactor: { kind: "Fido2", credentialAssertion } }
  <- AuthTokens
```

### Logout
```text
logout(username)
  -> PUT /auth/logout (Authorization: Bearer {token}, X-Username: {username})
  -> tokenManager.clearTokens(username)
```

## Dependencies

| Package | Usage |
|---------|-------|
| `@ion/config` | `environmentConfig` for default client factory |
| `@ion/network` | `HttpClient` for all API calls |
| `@ion/storage` | `ISecureStorage` for token persistence |
| `@noble/curves` | Ed25519 signatures |
| `@noble/hashes` | SHA256, PBKDF2 |
| `@noble/ciphers` | AES-GCM encryption |
| `@scure/base` | Base64, base64url encoding/decoding |
| `jwt-decode` | JWT payload extraction |
| `json-stable-stringify` | Canonical JSON serialization for signing |
| `react-native-passkey` | Native passkey support (peer, optional) |

## Design Decisions

- **Token storage is opaque.** Tokens are stored via `ISecureStorage`. The package never exposes raw tokens.
- **Credential signing uses Ed25519 with PEM encoding.** Private keys are encrypted with the user's password using PBKDF2+AES-GCM before sending to the server.
- **Data sources are thin HTTP wrappers.** No business logic -- they map function calls to HTTP requests. All orchestration lives in `auth/` modules.
- **Platform-split passkey.** `platform/passkey.web.ts` and `platform/passkey.native.ts` follow the triple-file pattern (stub + web + native). Bundlers resolve the correct implementation at build time.

## React Native Requirements

When using in React Native, the consuming app must provide polyfills before importing this package:
- `react-native-get-random-values` (crypto.getRandomValues)
- `text-encoding-polyfill` (TextEncoder/TextDecoder)
- `react-native-passkey` (for passkey support)
