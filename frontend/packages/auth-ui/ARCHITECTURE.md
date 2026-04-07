# @ion/auth-ui Architecture

Authentication UI component library. Provides pre-built screens for registration, passkey verification, and password verification flows.

## Public API

### Screens
- `GetStartedScreen` -- Initial login with identity key entry
- `PasswordRegisterScreen` -- Password-based registration with identity key name, password + confirm, strength checklist
- `PasskeyRegisterScreen` -- Passkey-based registration
- `IdentityKeyNameNoteScreen` -- Identity key name informational screen
- `RestoreMenuScreen` -- Restore method selection (cloud or credential)
- `RestoreCredentialsScreen` -- Credential-based account restore form
- `RestoreCloudScreen` -- Cloud-based account restore
- `SetNewPasswordScreen` -- Set new password after credential recovery
- `RestoreSuccessModal` -- Success confirmation after restore
- `IdentityKeyNotFoundModal` -- Error modal for unrecognized identity key
- `VerifyPasskeyScreen` -- Passkey verification loading state (auto-dismisses after 3s)
- `VerifyPasskeySheetScreen` -- Passkey verification in bottom sheet
- `VerifyPasswordBackground`, `VerifyPasswordOverlay` -- Password verification modal

### Components
- `PrimaryButton`, `SecondaryButton`, `TextButton` -- Button variants
- `RegisterHeader`, `SheetHeader` -- Header layouts
- `SecuredByFooter`, `TermsFooter` -- Footer branding
- `RegisterForm` -- Identity key form with validation
- `PasskeyBenefitList` -- Educational passkey benefits
- `PasswordStrengthChecklist` -- Visual password rules

### Validation
- `validateIdentityKeyName(value)` -- Sync: returns error string or null
- `useIdentityKeyValidation()` -- Hook with state management
- `buildPasswordRules(password)` -- Returns `PasswordRule[]`
- `areAllPasswordRulesMet(password)` -- Boolean check

### Icons
21 SVG icon components (auth-specific: passkey, fingerprint, identity key, etc.)

## Authentication Flows

```
GetStarted -> Register (new user, password or passkey)
           -> VerifyPasskey (existing user)
           -> VerifyPassword (fallback)
           -> RestoreMenu -> RestoreCredentials -> SetNewPassword
                          -> RestoreCloud
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

- **Callback-driven navigation**: Screens receive `onNavigateToX`, `onContinue`, `onBack` callbacks. No router dependency.
- **Self-contained icons**: 21 custom SVG components rather than using `@ion/ui` icon registry (auth-specific visuals).
- **Hook-based forms**: `useRegisterPasswordForm()` and `useIdentityKeyValidation()` encapsulate form state.
- **Hardcoded styling**: Uses direct hex colors rather than `@ion/ui` tokens (predates token system).

## Dependencies

- **Runtime**: `@ion/ui` (TextField component)
- **Peer deps**: `react`, `react-native`, `react-native-svg`
- **Downstream**: `@ion/ui` (foundation)
- **Upstream consumers**: App shells (mobile/web auth screens)

## File Structure

```
src/
  index.ts                          # All exports
  get-started-screen.tsx
  password-register-screen.tsx
  passkey-register-screen.tsx
  identity-key-name-note-screen.tsx
  restore-menu-screen.tsx
  restore-credentials-screen.tsx
  restore-cloud-screen.tsx
  set-new-password-screen.tsx
  restore-success-modal.tsx
  identity-key-not-found-modal.tsx
  verify-passkey-screen.tsx
  verify-passkey-sheet-screen.tsx
  verify-password-screen.tsx
  primary-button.tsx, secondary-button.tsx, text-button.tsx
  register-header.tsx, sheet-header.tsx
  secured-by-footer.tsx, terms-footer.tsx
  password-strength-checklist.tsx
  identity-key-rules.ts (+test)
  password-rules.tsx (+test)
  [SVG icon components]
```
