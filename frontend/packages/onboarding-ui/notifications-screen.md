# Screen 4: Turn on Notifications — Implementation Plan

## Context

Screen 4 is the final onboarding screen. It shows 3 example notification cards, 3 benefit descriptions, and a Continue button that requests notification permission before advancing. No back navigation — this is the terminal screen in the onboarding flow.

Figma node: `22042:47917`, file key `3TnZngoFeklOVC8TexlR1D`.

---

## Step 1: Export SVG Icons from Figma

Export 3 description icons via Figma REST API as SVG:

| Figma Node | Filename | Registry Key |
|---|---|---|
| `22042:47981` (icon/button_receive) | `icon_button-receive.svg` | `button-receive` |
| `22042:47975` (articles) | `icon_articles.svg` | `articles` |
| `22042:47978` (icon/chat_off) | `icon_chat-off.svg` | `chat-off` |

Save to `packages/ui/src/icons/assets/`.

Run `pnpm --filter @ion/ui generate:icons` to auto-generate:
- `packages/ui/src/icons/generated/ButtonReceiveIcon.tsx`
- `packages/ui/src/icons/generated/ArticlesIcon.tsx`
- `packages/ui/src/icons/generated/ChatOffIcon.tsx`
- Updated `icon-registry.ts` and `icon-types.ts`

---

## Step 2: Export Raster Avatar Images from Figma

Export 3 notification card avatars as PNG (@1x, @2x, @3x) via Figma REST API.

The first card ("Received ION") has a badge overlay on the avatar. Export avatar1 + badge as a **single composite image** from the parent frame node `22042:47993`.

| Figma Node | Filename | Content |
|---|---|---|
| `22042:47993` (avatar1 + badge composite) | `avatar-received-ion.png` / `@2x` / `@3x` | Avatar with ice badge overlay |
| `22042:47985` (avatar2) | `avatar-new-follower.png` / `@2x` / `@3x` | Follower avatar |
| `22042:48003` (avatar3) | `avatar-new-message.png` / `@2x` / `@3x` | Message avatar |

Save to `packages/onboarding-ui/src/assets/`.

Figma REST API call pattern:
```
GET https://api.figma.com/v1/images/{fileKey}?ids={nodeId}&format=png&scale=1
GET https://api.figma.com/v1/images/{fileKey}?ids={nodeId}&format=png&scale=2
GET https://api.figma.com/v1/images/{fileKey}?ids={nodeId}&format=png&scale=3
```

---

## Step 3: Create `NotificationCard.tsx`

**File:** `packages/onboarding-ui/src/components/NotificationCard.tsx`

**Props:**
```typescript
export interface NotificationCardProps {
  avatar: ImageSourcePropType;
  title: string;
  description: string;
  time: string;
  testID?: string;
}
```

**Layout (from Figma):**
- Background: `colors.primaryAccent` (#0166FF)
- Border radius: 16px
- Padding: 10px (all sides, matching Figma `p-[10px]`)
- Gap: 10px between avatar and text
- Row layout: avatar + text column

**Avatar:**
- Size: 36x36
- Border radius: 10px

**Text:**
- Title row: title (left) + time (right), `justifyContent: "space-between"`
- Title: `Text` variant="body" (semibold 13px), color=`colors.secondaryBackground` (white on blue)
- Description: `Text` variant="caption3" (regular 11px), color=`colors.tertiaryBackground` (rgba(255,255,255,0.65) equivalent — use `onColors` token if available, otherwise `tertiaryBackground`)
- Time: `Text` variant="caption3", same muted color as description

**Style builders:** Inline in same file (small component). Use `useMemo` + `scale()`.

---

## Step 4: Create `DescriptionItem.tsx`

**File:** `packages/onboarding-ui/src/components/DescriptionItem.tsx`

**Props:**
```typescript
export interface DescriptionItemProps {
  iconName: IconName;
  text: string;
  testID?: string;
}
```

**Layout:**
- Row: `flexDirection: "row"`, `alignItems: "center"`
- Icon: `<Icon name={iconName} size={scale(27)} color={colors.secondaryText} />`
- Icon right spacing: 11px gap (from Figma: 38px text left - 27px icon = 11px gap)
- Text: `Text` variant="body2", color=`colors.secondaryText`

---

## Step 5: Create `notifications-styles.ts`

**File:** `packages/onboarding-ui/src/screens/notifications-styles.ts`

Style builders following the pattern in `discover-creators-styles.ts`:

```typescript
// Content area below the title
export function buildContentContainerStyle(scale): ViewStyle {
  return {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: scale(16),
    paddingTop: scale(34),       // 34px gap between title section and content (matches Figma)
  };
}

// Cards container: 290px wide, 8px gap between cards
export function buildCardsContainerStyle(scale): ViewStyle {
  return {
    width: scale(290),
    gap: scale(8),               // 8px between notification cards (from spec: top card at y=0, next at y=70 with h=58+gap ~= 8)
  };
}

// Description items container: 20px gap, 24px below cards
export function buildDescriptionsContainerStyle(scale): ViewStyle {
  return {
    width: scale(290),
    gap: scale(20),
    paddingTop: scale(69),       // 69px gap from Figma (263 - 194 = 69px between cards bottom and descriptions top)
  };
}
```

---

## Step 6: Create `NotificationsScreen.tsx`

**File:** `packages/onboarding-ui/src/screens/NotificationsScreen.tsx`

**Pattern:** Follows `DiscoverCreatorsScreen.tsx` structure.

```
BottomSheet (isVisible, onClose, NO onBack, bottomButton)
  OnboardingScreenTitle (title="Turn on notifications", subtitle="Receive notifications when you transfer and receive funds")
  View (contentContainer)
    View (cardsContainer)
      NotificationCard (Received ION, avatar1+badge, "You received 873 ION from @james", "15m ago")
      NotificationCard (New follower, avatar2, "@curtis has started following you", "24m ago")
      NotificationCard (New message, avatar3, "@marie has sent you a message", "31m ago")
    View (descriptionsContainer)
      DescriptionItem (icon="button-receive", "Receive notifications when your sending or receiving assets")
      DescriptionItem (icon="articles", "Stay up to date with the latest news")
      DescriptionItem (icon="chat-off", "Chat and receive notifications even if the application is closed")
  Button (bottomButton slot, "Continue", onPress=handleContinue)
```

**Reuse:** `OnboardingScreenTitle` from `../components/OnboardingScreenTitle` (same as SelectLanguages + DiscoverCreators screens).

**Continue handler:** Calls `requestNotificationPermission()` then `onContinue()`.

**Props:** `OnboardingScreenProps` — only `onContinue` used (no `onBack`). `handleClose` still wired to `onContinue` since there's no back.

---

## Step 7: Create `requestNotificationPermission` Action Stub

**File:** `packages/onboarding/src/request-notification-permission.ts`

```typescript
// TODO: Wire to @ion/push-notifications when available
export async function requestNotificationPermission(): Promise<void> {
  // TODO: Request push notification permission via platform API
}
```

**Pattern:** Matches `follow-creator.ts`, `unfollow-creator.ts`, `complete-onboarding.ts` stubs.

**Export:** Add to `packages/onboarding/src/index.ts`:
```typescript
export { requestNotificationPermission } from "./request-notification-permission";
```

---

## Step 8: Update Exports

**File:** `packages/onboarding-ui/src/index.ts`

Add:
```typescript
export { NotificationsScreen } from "./screens/NotificationsScreen";
```

---

## File Summary

| File | Action | Package |
|---|---|---|
| `ui/src/icons/assets/icon_button-receive.svg` | Create (Figma export) | `@ion/ui` |
| `ui/src/icons/assets/icon_articles.svg` | Create (Figma export) | `@ion/ui` |
| `ui/src/icons/assets/icon_chat-off.svg` | Create (Figma export) | `@ion/ui` |
| `ui/src/icons/generated/*` + registry + types | Auto-generate (`pnpm generate:icons`) | `@ion/ui` |
| `onboarding-ui/src/assets/avatar-received-ion.png` (@1x/@2x/@3x) | Create (Figma export) | `@ion/onboarding-ui` |
| `onboarding-ui/src/assets/avatar-new-follower.png` (@1x/@2x/@3x) | Create (Figma export) | `@ion/onboarding-ui` |
| `onboarding-ui/src/assets/avatar-new-message.png` (@1x/@2x/@3x) | Create (Figma export) | `@ion/onboarding-ui` |
| `onboarding-ui/src/components/NotificationCard.tsx` | Create (~60 lines) | `@ion/onboarding-ui` |
| `onboarding-ui/src/components/DescriptionItem.tsx` | Create (~30 lines) | `@ion/onboarding-ui` |
| `onboarding-ui/src/screens/notifications-styles.ts` | Create (~30 lines) | `@ion/onboarding-ui` |
| `onboarding-ui/src/screens/NotificationsScreen.tsx` | Create (~70 lines) | `@ion/onboarding-ui` |
| `onboarding-ui/src/index.ts` | Modify (add export) | `@ion/onboarding-ui` |
| `onboarding/src/request-notification-permission.ts` | Create (~5 lines) | `@ion/onboarding` |
| `onboarding/src/index.ts` | Modify (add export) | `@ion/onboarding` |

---

## Verification

1. `pnpm --filter @ion/ui generate:icons` — generates icon components without errors
2. `pnpm --filter @ion/onboarding-ui lint` — no lint violations
3. `pnpm --filter @ion/onboarding-ui type-check` — no type errors
4. `pnpm --filter @ion/onboarding type-check` — no type errors
5. Visual QA via `preview_start` + `preview_screenshot` — compare against Figma node `22042:47917`
6. Verify: no back arrow present, Continue button renders, cards show correct text/avatars, description icons render
