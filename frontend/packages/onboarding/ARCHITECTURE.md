# @ion/onboarding Architecture

Action stubs for the onboarding workflow. Covers profile creation, avatar upload, validation, language selection, creator discovery, notification permission, and onboarding completion. Currently stub implementations awaiting backend integration.

## Public API

```typescript
export { saveProfile }              // Save display name, nickname, referral
export { uploadAvatar }             // Upload profile photo (with NSFW check)
export { validateNickname }         // Check nickname availability/reservation
export { validateReferral }         // Verify referral code validity
export { fetchLanguages }           // Fetch available languages
export { saveSelectedLanguages }    // Persist language selections
export { fetchSuggestedCreators }   // Paginated creator suggestions
export { followCreator }            // Follow a creator
export { unfollowCreator }          // Unfollow a creator
export { requestNotificationPermission } // Request push notification permission
export { completeOnboarding }       // Mark onboarding as complete
export { ActionError }              // Structured error with code + userMessage

export type {
  SaveProfileInput, SaveProfileResult,
  UploadAvatarInput, UploadAvatarResult,
  ValidateNicknameResult, ValidateReferralResult,
  Language, FetchLanguagesResult, SaveSelectedLanguagesInput,
  Creator, FetchSuggestedCreatorsInput, FetchSuggestedCreatorsResult,
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
| `validateNickname` | `@ion/identity-client` | Stub (pattern validation active) |
| `validateReferral` | `@ion/identity-client` | Stub |
| `fetchLanguages` | `@ion/identity-client` or `@ion/config` | Stub (returns hardcoded list) |
| `saveSelectedLanguages` | `@ion/identity-client` | Stub |
| `fetchSuggestedCreators` | `@ion/identity-client` | Stub (returns hardcoded list) |
| `followCreator` | `@ion/ion-connect-client` | Stub |
| `unfollowCreator` | `@ion/ion-connect-client` | Stub |
| `requestNotificationPermission` | `@ion/permissions` + `@ion/push-notifications` | Stub |
| `completeOnboarding` | `@ion/identity-client` | Stub |

## Design Decisions

- **Type-first**: Interfaces defined before implementation. Frontend can build against contracts.
- **ActionError pattern**: Structured errors with user-facing messages. Screens display `error.userMessage`.
- **One action per file**: Each action in its own file matching the function name.

## Dependencies

- **Runtime**: None (stubs)
- **Planned**: `@ion/identity-client`, `@ion/media-upload`, `@ion/nsfw-detection`, `@ion/config`, `@ion/ion-connect-client`, `@ion/permissions`, `@ion/push-notifications`
- **Upstream consumers**: `@ion/onboarding-ui` screens

## File Structure

```
src/
  index.ts
  types.ts                            # ActionError + all interfaces
  save-profile.ts                     # Stub
  upload-avatar.ts                    # Stub
  validate-nickname.ts                # Stub (pattern validation active)
  validate-referral.ts                # Stub
  fetch-languages.ts                  # Stub (hardcoded language list)
  save-selected-languages.ts          # Stub
  fetch-suggested-creators.ts         # Stub (hardcoded creator list)
  fetch-suggested-creators.test.ts    # Tests pagination behavior
  follow-creator.ts                   # Stub
  unfollow-creator.ts                 # Stub
  request-notification-permission.ts  # Stub
  complete-onboarding.ts              # Stub
  onboarding.test.ts                  # Verifies exports
```
