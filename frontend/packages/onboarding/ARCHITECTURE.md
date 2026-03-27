# @ion/onboarding Architecture

Action stubs for the onboarding workflow. Defines the interface for profile creation, avatar upload, and validation operations. Currently stub implementations awaiting backend integration.

## Public API

```typescript
export { saveProfile }         // Save display name, nickname, referral
export { uploadAvatar }        // Upload profile photo (with NSFW check)
export { validateNickname }    // Check nickname availability/reservation
export { validateReferral }    // Verify referral code validity
export { ActionError }         // Structured error with code + userMessage

export type {
  SaveProfileInput, SaveProfileResult,
  UploadAvatarInput, UploadAvatarResult,
  ValidateNicknameResult, ValidateReferralResult,
}
```

## Data Structures

```typescript
class ActionError extends Error {
  code: string;          // Machine-readable: 'MESSAGE_SEND_FAILED'
  userMessage: string;   // Human-readable: 'Could not send message.'
}

interface SaveProfileInput {
  displayName: string;
  nickname: string;
  referredBy?: string;
}

interface ValidateNicknameResult {
  isAvailable: boolean;
  isReserved: boolean;
}
```

## Planned Integration

| Action | Target Package | Status |
|--------|---------------|--------|
| `saveProfile` | `@ion/identity-client` | Stub |
| `uploadAvatar` | `@ion/media-upload` + `@ion/nsfw-detection` | Stub |
| `validateNickname` | `@ion/identity-client` | Stub |
| `validateReferral` | `@ion/identity-client` | Stub |

All functions currently throw "not implemented" errors.

## Design Decisions

- **Type-first**: Interfaces defined before implementation. Frontend can build against contracts.
- **ActionError pattern**: Structured errors with user-facing messages. Screens display `error.userMessage`.
- **One action per file**: Each action in its own file matching the function name.

## Dependencies

- **Runtime**: None (stubs)
- **Planned**: `@ion/identity-client`, `@ion/media-upload`, `@ion/nsfw-detection`
- **Upstream consumers**: `@ion/onboarding-ui` screens

## File Structure

```
src/
  index.ts
  types.ts                      # ActionError + all interfaces
  save-profile.ts               # Stub
  upload-avatar.ts              # Stub
  validate-nickname.ts          # Stub
  validate-referral.ts          # Stub
  onboarding.test.ts            # Verifies stubs throw
```
