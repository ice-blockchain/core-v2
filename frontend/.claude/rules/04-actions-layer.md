---
paths:
  - "packages/actions/**/*"
  - "apps/mobile/src/screens/**/*"
---

# The Actions Layer — Internal SDK

## Purpose

The 21 packages are the engine. The actions layer is the steering wheel. A new developer should never need to understand relays, encryption, chunking, or token lifecycle. They call one function, it works.

`@ion/actions` sits between screens and packages. It exposes simple, business-oriented functions that orchestrate multiple packages behind a clean API.

---

## Rules

### CRITICAL: Screens only import from `@ion/actions`.
All business logic is accessed through the actions layer. Screens never import clients, features, media, or foundation packages directly.

**Only exception:** `@ion/media-viewer` for UI components (ImageViewer, VideoPlayer).

```typescript
// CORRECT — in a screen file
import { sendMessage } from '@ion/actions';

// VIOLATION — in a screen file
import { IonConnectClient } from '@ion/ion-connect-client';
```

### CRITICAL: One action = one file = one exported function.
`send-message.ts` exports `sendMessage()`. Nothing else.

### CRITICAL: Simple inputs, simple outputs.
Actions accept plain objects (strings, numbers, arrays) and return plain results. No package-specific types leak to the caller. The new dev never sees `RelayEvent`, `EncryptedChunk`, or `DfnsTransaction`.

### CRITICAL: Actions never call other actions.
Each action is a leaf function. If two actions share logic, extract the shared part into a package. This prevents hidden chains.

### IMPORTANT: Error handling at the action boundary.
Actions catch package-level errors and translate them into `ActionError`:
```typescript
try {
  await IonConnectClient.publishEvent(event);
} catch (error) {
  throw new ActionError(
    'MESSAGE_SEND_FAILED',
    'Could not send message. Check your connection.'
  );
}
```
Screens never handle `RelayConnectionError` — they handle `ActionError`.

### IMPORTANT: Actions are the test boundary.
Integration tests are written against actions, not screens and not individual packages. If `sendMessage()` works end-to-end, the screen that calls it is just UI.

---

## Package Structure

```
packages/actions/
  src/
    feed/
      create-post.ts
      create-post.test.ts
      delete-post.ts
      like-post.ts
      repost-post.ts
      report-content.ts
    chat/
      send-message.ts
      send-message.test.ts
      delete-message.ts
      create-conversation.ts
      mute-conversation.ts
    wallet/
      deposit-funds.ts
      withdraw-funds.ts
      swap-tokens.ts
      get-wallet-balance.ts
    profile/
      update-profile.ts
      follow-user.ts
      unfollow-user.ts
      block-user.ts
    media/
      pick-and-upload-media.ts
      capture-photo.ts
      capture-video.ts
    sharing/
      share-content.ts
      handle-inbound-share.ts
    auth/
      login.ts
      logout.ts
  index.ts
  package.json
```

---

## Actions Catalog

| Domain | Action | Packages Orchestrated |
|---|---|---|
| **Feed** | `createPost(text, media)` | media-processing, media-upload, nsfw-detection, content-labeling, ion-connect-client |
| | `deletePost(postId)` | ion-connect-client |
| | `likePost(postId)` | ion-connect-client |
| | `repostPost(postId, comment?)` | ion-connect-client |
| | `reportContent(postId, reason)` | ion-connect-client, identity-client |
| **Chat** | `sendMessage(convId, text, media)` | media-processing, media-upload, nsfw-detection, ion-connect-client |
| | `deleteMessage(messageId)` | ion-connect-client |
| | `createConversation(userIds)` | ion-connect-client, identity-client |
| | `muteConversation(convId)` | ion-connect-client, storage |
| **Wallet** | `depositFunds(amount, coinId)` | wallet-client, identity-client |
| | `withdrawFunds(amount, address)` | wallet-client, identity-client |
| | `swapTokens(from, to, amount)` | wallet-client, token-analytics-client |
| | `getWalletBalance()` | wallet-client |
| **Profile** | `updateProfile(name, bio, avatar)` | media-processing, media-upload, identity-client, ion-connect-client |
| | `followUser(userId)` | ion-connect-client |
| | `unfollowUser(userId)` | ion-connect-client |
| | `blockUser(userId)` | ion-connect-client, storage |
| **Media** | `pickAndUploadMedia(options)` | permissions, media-acquisition, media-processing, nsfw-detection, media-upload |
| | `capturePhoto()` | permissions, media-acquisition, media-processing |
| | `captureVideo(maxDuration)` | permissions, media-acquisition, media-processing |
| **Sharing** | `shareContent(postId)` | sharing, deep-links, ion-connect-client |
| | `handleInboundShare(payload)` | sharing, media-acquisition, media-processing |
| **Auth** | `login(credentials)` | identity-client, storage, push-notifications, config |
| | `logout()` | identity-client, storage, push-notifications |

---

## New Developer Workflow

1. **Check if an action exists.** Browse `packages/actions/src/[domain]/`.
2. **If yes:** Import it in your screen. Call it. Write UI. Done.
3. **If no:** Create `packages/actions/src/[domain]/[verb]-[noun].ts`, follow existing patterns in the same domain, write a test, export from `index.ts`.
4. **You should never need to:** understand relays, encryption, DFNS, or any package internals to build a feature.
