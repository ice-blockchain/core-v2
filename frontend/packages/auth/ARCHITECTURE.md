# @ion/auth

Actions-layer package that orchestrates `@ion/identity-client` into a stateful auth flow via a React hook.

## Public API

```typescript
export { useAuthFlow } from './use-auth-flow';
export { authFlowReducer } from './auth-flow-reducer';
export type { AuthPhase, AuthFlowConfig, AuthFlowState, AuthFlowAction, AuthScreenProps } from './types';
```

## Auth Flow State Machine

```
get-started  ──"Register"──>  register  ──onContinue──>  registerWithPassword  ──>  onAuthSuccess
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

Passkey fallback: if passkey fails with PASSKEY_CANCELLED or PASSKEY_NOT_AVAILABLE and password is supported, transitions to verify-password.

## State Management

Uses React `useReducer` (project standard — no external state management libraries).

Phases: `get-started` | `register` | `verify-passkey` | `verify-password`

State shape: `{ phase, identityKeyName, isLoading, error }`.

## Screen Prop Binding Pattern

The hook returns `screenProps` matching each `@ion/auth-ui` component's props. The app layer imports both packages and connects them:

```typescript
const { state, screenProps } = useAuthFlow(config);
// App renders: <GetStartedScreen {...screenProps.getStarted} />
```

`@ion/auth-ui` is NOT a dependency — the app layer bridges them.

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
- `react` (peer) — hooks

## Future Extensibility

New phases extend the `AuthPhase` union and add reducer cases + handler files:
- Account recovery: `recovery-input`, `recovery-bind-passkey`
- 2FA during login: `enter-2fa-code`
- Passkey registration: `register-passkey`
