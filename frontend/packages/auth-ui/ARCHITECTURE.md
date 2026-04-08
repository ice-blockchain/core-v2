# @ion/auth-ui Architecture

Authentication UI component library. Provides pre-built screens for registration, passkey verification, password verification, and identity restore flows.

## Public API

### Screens
- `GetStartedScreen` -- Initial login with identity key entry
- `PasswordRegisterScreen` -- Password-based registration with identity key name, password + confirm, strength checklist
- `PasskeyRegisterScreen` -- Passkey-based registration
- `IdentityKeyNameNoteScreen` -- Identity key name informational screen
- `RestoreIdentityScreen` -- Restore method selection (cloud or credentials)
- `RestoreWithRecoveryCredsScreen` -- Credential-based identity key restore (identity key name + recovery key ID + recovery code)
- `RestoreSetNewPasswordScreen` -- Set new password after credential recovery
- `RestoreSuccessScreen` -- Success confirmation after restore
- `LinkDeviceScreen` -- Device linking screen
- `VerifySheetScreen` -- Verification in bottom sheet (passkey or password method)
- `VerifyOnOtherDeviceScreen` -- Cross-device verification
- `AddBiometricsScreen` -- Biometrics setup screen
- `AddPasskeyCredentialsScreen` -- Passkey credentials setup
- `InvalidCredentialsModal` -- Error modal for invalid credentials
- `ConfirmPasswordScreen` -- Password confirmation screen

### Shared Components
- `PrimaryButton` -- Primary action button
- `RegisterHeader` -- Auth screen header layout
- `AuthFooter` -- Footer branding
- `PasswordFormFields` -- Reusable password + confirm fields with strength checklist
- `IdentityKeyNameInput` -- Identity key name input with info button
- `RecoveryKeyIdInput` -- Recovery key ID input
- `RecoveryCodeInput` -- Recovery code input
- `RestoreOptionCard` -- Restore method selection card

### Context
- `AuthActionsContext` -- React context providing auth actions to screens
- `useAuthActions()` -- Hook to consume auth actions from context

### Hooks
- `useIdentityKeyValidation()` -- Identity key form state with validation
- `usePasswordForm()` -- Password + confirm form state with rules

### Validation
- `validateIdentityKeyName(value)` -- Sync: returns error string or null
- `buildPasswordRules(password)` -- Returns `PasswordRule[]`
- `areAllPasswordRulesMet(password)` -- Boolean check
- `isInlineAuthError(code)` -- Checks if error should be shown inline vs modal

## Authentication Flows

```
GetStarted -> Register (new user, password or passkey)
           -> VerifySheet (existing user, passkey or password)
           -> RestoreIdentity -> RestoreWithRecoveryCreds -> RestoreSetNewPassword -> RestoreSuccess
                              -> RestoreCloud (placeholder, not yet implemented)
```

## Validation Rules

**Identity Key Name:**
- Pattern: `/^[a-z0-9._-]+$/`
- Lowercase, numbers, dots, hyphens, underscores only

**Password (4 rules, all must pass):**
1. Length > 8 characters
2. At least 1 number
3. Mix of uppercase and lowercase
4. At least 1 special character

## Design Decisions

- **Context-driven actions**: Screens consume auth operations via `AuthActionsContext` rather than importing actions directly. This decouples UI from store implementation.
- **Navigator-driven navigation**: Screens use `useAuthNavigation()` and `useAppNavigation()` from `@ion/navigation`.
- **Self-contained icons**: Custom SVG components for auth-specific visuals (passkey, fingerprint, identity key, etc.).
- **Hook-based forms**: `usePasswordForm()` and `useIdentityKeyValidation()` encapsulate form state and validation.

## Dependencies

- **Runtime**: `@ion/ui` (TextField, Text, Icon, theming), `@ion/localization` (translate), `@ion/navigation` (routing)
- **Peer deps**: `react`, `react-native`, `react-native-svg`, `@gorhom/bottom-sheet`
- **Upstream consumers**: App shells (mobile/web auth screens), `@ion/auth` (provides AuthActionsProvider)

## File Structure

```
src/
  index.ts                              # All exports
  auth-actions-context.ts               # AuthActionsContext + useAuthActions
  get-started-screen.tsx
  password-register-screen.tsx
  passkey-register-screen.tsx
  identity-key-name-note-screen.tsx
  restore-identity-screen.tsx
  restore-with-recovery-creds-screen.tsx
  restore-set-new-password-screen.tsx
  restore-success-screen.tsx
  verify-sheet-screen.tsx
  verify-on-other-device-screen.tsx
  add-biometrics-screen.tsx
  add-passkey-credentials-screen.tsx
  link-device-screen.tsx
  invalid-credentials-modal.tsx
  confirm-password-screen.tsx
  primary-button.tsx
  register-header.tsx
  auth-footer.tsx
  password-form-fields.tsx
  use-password-form.tsx
  identity-key-name-input.tsx
  identity-key-rules.ts
  restore-option-card.tsx
  restore-key-icon.tsx
  is-inline-error.ts
  translations/
```
