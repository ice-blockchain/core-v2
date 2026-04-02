# @ion/auth

Actions-layer package that orchestrates `@ion/identity-client` into a stateful auth flow via a React hook.

## Public API

```typescript
export { useAuthFlow } from './use-auth-flow';
export type { AuthPhase, AuthFlowConfig, AuthFlowState, AuthScreenProps } from './types';
```

## Auth Flow State Machine

```text
get-started  ──"Register"──>  register  ──onContinue──>  registerWithPasskey (no password)
     │                            ▲  │                    or registerWithPassword (password)
     │                            │  │                          │
     │                            │  └── passkey cancelled ─────┘  ──>  onAuthSuccess
     │
     └──"Continue"──>  getLoginCapabilities()
                            │
                   ┌────────┴────────┐
                   │ supportsPasskey  │ supportsPassword only
                   ▼                 ▼
            verify-passkey     verify-password
                   │                 │
            loginWithPasskey   loginWithPassword
                   │                 │
            onAuthSuccess      onAuthSuccess
```

Passkey fallback (login): if passkey fails with PASSKEY_CANCELLED or PASSKEY_NOT_AVAILABLE and password is supported, transitions to verify-password.

Passkey cancel (register): if passkey registration is cancelled, returns to register phase (no error thrown to user).

## State Management

Uses React `useReducer` (project standard — no external state management libraries).

Phases: `get-started` | `register` | `verify-passkey` | `verify-password`

State shape: `{ phase, identityKeyName, isLoading, error }`.

## Screen Prop Binding Pattern

The hook returns `screenProps` matching each `@ion/auth-ui` component's props, plus flow control methods. The app layer imports both packages and connects them:

```typescript
const { state, screenProps, logout, isAuthenticated, resetFlow } = useAuthFlow(config);
// App renders: <GetStartedScreen {...screenProps.getStarted} />
```

- `logout(username)` — delegates to `identityClient.logout`
- `isAuthenticated(username)` — delegates to `identityClient.isAuthenticated`
- `resetFlow()` — returns to `get-started` phase

`@ion/auth-ui` is a dependency — `isValidIdentityKeyName` is imported for input validation in handlers.

## Dependency Injection

`AuthFlowConfig` injects: `identityClient` (API operations), `onAuthSuccess` (callback), `loadingElement` (React node).

## File Responsibilities

| File | Purpose |
|---|---|
| `types.ts` | All exported types |
| `error-messages.ts` | Maps IdentityErrorCode to user-facing strings |
| `auth-flow-reducer.ts` | Pure reducer state machine |
| `handle-login-attempt.ts` | Capability check + passkey-first login orchestration |
| `handle-register.ts` | Registration orchestration |
| `handle-password-login.ts` | Password login orchestration |
| `use-auth-flow.ts` | Main hook composing reducer + handlers + screen props |

## Dependencies

- `@ion/identity-client` (workspace) — API operations
- `@ion/auth-ui` (workspace) — input validation (`isValidIdentityKeyName`)
- `react` (peer) — hooks

## Future Extensibility

New phases extend the `AuthPhase` union and add reducer cases + handler files:
- Account restore: `onNavigateToRestore` callback is wired in GetStarted but handler is TODO
- Account recovery: `recovery-input`, `recovery-bind-passkey`
- 2FA during login: `enter-2fa-code`
- Passkey registration: `register-passkey`
