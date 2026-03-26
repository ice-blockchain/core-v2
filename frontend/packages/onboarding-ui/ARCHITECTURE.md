# Onboarding UI Flow

Figma source: `https://www.figma.com/design/3TnZngoFeklOVC8TexlR1D/ICE-Cloud?node-id=50256-221731`

## Overview

The onboarding flow is a linear, multi-step wizard presented as a bottom sheet over a dark backdrop.
Users complete profile setup, choose languages, follow suggested creators, and enable notifications
before entering the main app.

```
Profile Setup --> Select Languages --> Discover Creators --> Turn on Notifications --> Main App
```

---

## Implementation Structure

### Package Layout (aligned with `packages/auth-ui/` convention)

```
packages/onboarding-ui/
  src/
    screens/
      ProfileSetupScreen.tsx
      ProfileSetupScreen.test.tsx
      SelectLanguagesScreen.tsx
      SelectLanguagesScreen.test.tsx
      DiscoverCreatorsScreen.tsx
      DiscoverCreatorsScreen.test.tsx
      NotificationsScreen.tsx
      NotificationsScreen.test.tsx
    components/                          # Onboarding-specific components (not shared)
      AvatarPicker.tsx
      AvatarPicker.test.tsx
      CheckboxRow.tsx
      CheckboxRow.test.tsx
      CreatorRow.tsx
      CreatorRow.test.tsx
      NotificationCard.tsx
      NotificationCard.test.tsx
      DescriptionItem.tsx
      DescriptionItem.test.tsx
    types.ts
    index.ts                             # Public API: exports screens only
  onboarding.md                          # This file
  package.json
```

### Components Placement Decision

| Component | Location | Reason |
|---|---|---|
| `BottomSheet` | `@ion/ui` | Reusable across many features (modals, pickers, confirmations) |
| `TextInput` | `@ion/ui` | Reusable (settings, search, chat, forms everywhere) |
| `SearchBar` | `@ion/ui` | Reusable (feed search, user search, language search) |
| `HorizontalSeparator` | `@ion/ui` | Gradient divider line used above bottom-pinned buttons app-wide |
| `AvatarPicker` | `packages/onboarding-ui/` | Onboarding-specific for now. Promote to `@ion/ui` if profile edit reuses |
| `CheckboxRow` | `packages/onboarding-ui/` | Onboarding-specific. Promote if reused later |
| `CreatorRow` | `packages/onboarding-ui/` | Onboarding-specific. Similar row may appear in search/feed — promote then |
| `NotificationCard` | `packages/onboarding-ui/` | Only used in onboarding notifications screen |
| `DescriptionItem` | `packages/onboarding-ui/` | Icon + text row, only used in notifications screen |

### Icons (all registered in `@ion/ui`)

All icons needed for onboarding are implemented: `at-sign`, `back-arrow`, `camera`, `chat-bubble`,
`checkbox-off`, `checkbox-on`, `checkmark`, `clock`, `close`, `field-inviter`, `field-name`,
`manage`, `name-reserved`, `news`, `person-add`, `person-following`, `profile-save`, `search`, `send`

To add new icons: SVG -> `packages/ui/assets/icon_[name].svg` -> `pnpm --filter @ion/ui generate:icons`

### Actions Needed (`@ion/onboarding`)

Each screen maps to actions. These are the business functions screens will call:

| Action | File | Calls |
|---|---|---|
| `saveProfile` | `save-profile.ts` | `@ion/identity-client` |
| `uploadAvatar` | `upload-avatar.ts` | `@ion/media-upload`, `@ion/nsfw-detection` |
| `validateNickname` | `validate-nickname.ts` | `@ion/identity-client` |
| `validateReferral` | `validate-referral.ts` | `@ion/identity-client` |
| `fetchLanguages` | `fetch-languages.ts` | `@ion/identity-client` or `@ion/config` |
| `saveSelectedLanguages` | `save-selected-languages.ts` | `@ion/identity-client` |
| `fetchSuggestedCreators` | `fetch-suggested-creators.ts` | `@ion/identity-client` |
| `followCreator` | `follow-creator.ts` | `@ion/ion-connect-client` |
| `unfollowCreator` | `unfollow-creator.ts` | `@ion/ion-connect-client` |
| `requestNotificationPermission` | `request-notification-permission.ts` | `@ion/permissions`, `@ion/push-notifications` |
| `completeOnboarding` | `complete-onboarding.ts` | `@ion/identity-client` |

### Dependency Flow (per architecture rules)

```
apps/mobile/  ─── OnboardingNavigator (React Navigation) ───┐
apps/web/     ─── /onboarding/* routes (React Router)  ─────┤
                                                             ▼
                                              packages/onboarding-ui/
                                              (shared screens + components)
                                                     │
                                          ┌──────────┴──────────┐
                                          ▼                     ▼
                                    @ion/onboarding          @ion/ui
                                   (business logic)   (components, tokens)
```

Screens ONLY import from `@ion/onboarding` and `@ion/ui`. Never from clients or foundation directly.
Screens never import a router — they receive `onContinue` / `onBack` callbacks as props.

### Cross-Platform Strategy (Option B: Shared Screens, Separate Navigators)

The onboarding package contains **pure UI screens** that work on both mobile and web.
Navigation is handled per-platform in the app shell.

**Screens are router-agnostic.** Every screen receives navigation callbacks as props:

```typescript
// packages/onboarding-ui/src/types.ts
type OnboardingScreenProps = {
  onContinue: () => void;
  onBack?: () => void;     // undefined = no back button
};

// Screen never calls navigation directly
function ProfileSetupScreen({ onContinue, onBack }: OnboardingScreenProps) { ... }
```

**Mobile app** wires React Navigation:
```
apps/mobile/src/navigation/
  OnboardingNavigator.tsx        # React Navigation stack, imports shared screens
```

**Web app** wires React Router (or TanStack Router):
```
apps/web/src/routes/
  onboarding/
    index.tsx                    # /onboarding -> ProfileSetup
    languages.tsx                # /onboarding/languages -> SelectLanguages
    creators.tsx                 # /onboarding/creators -> DiscoverCreators
    notifications.tsx            # /onboarding/notifications -> Notifications
```

**Platform-specific components** use `.native.tsx` / `.web.tsx` extension pattern
(same as `@ion/config`, `@ion/storage`, `@ion/permissions`):

| Component | Why split needed |
|---|---|
| `BottomSheet` | Native: RN bottom sheet library with gesture handler. Web: CSS fixed positioning + portal. |
| `AvatarPicker` | Native: RN image picker. Web: `<input type="file">`. (Handled by `@ion/media-acquisition` which already has platform split.) |
| `KeyboardAvoidance` | Native: KeyboardAvoidingView. Web: not needed (browser handles natively). |

Everything else (TextInput, Button, Text, Box, Icon, FlatList) works identically
via `react-native-web` — no platform split required.

### Implementation Status

| # | Step | Status |
|---|---|---|
| 1 | Shared UI components in `@ion/ui` | DONE — BottomSheet, TextInput, TextField, SearchBar, HorizontalSeparator, all icons |
| 2 | Screen 1: Profile Setup | DONE — ProfileSetupScreen, AvatarPicker, NicknameReservedModal, AuthHeader |
| 3 | Screen 2: Select Languages | TODO |
| 4 | Screen 3: Discover Creators | TODO |
| 5 | Screen 4: Notifications | TODO |
| 6 | Navigation wiring (mobile + web) | TODO |

Each screen is one PR. Shared components are a separate PR first (per one-PR-one-concern rule).

---

## Shared Bottom Sheet Behavior

All four screens share identical sheet chrome. Implemented as `BottomSheet` in `@ion/ui`.

### Sheet Shape
- Top corners: 30px border radius (scaled)
- Background: `colors.onPrimaryAccent` (white)
- Overlay behind sheet: `colors.backgroundSheet` (#081532b2)

### Drag Handle
- Width: 50px, height: 3px, centered
- Color: `colors.sheetLine`
- Padding: 19px top, 8px bottom

### Navigation Bar (pinned at top when scrolled)
- Back arrow button (left) — optional, hidden on Screen 1 initial state
- Title text (center) — fades in as user scrolls down
- Title fade: opacity 0 at scroll offset 120px, opacity 1 at 140px

### Bottom Bar (pinned at bottom)
- `HorizontalSeparator` — gradient line: secondaryBackground -> onTertiaryFill -> secondaryBackground, height 0.5px
- Continue/Save button in `ScreenSideOffset.small` (16px horizontal padding)
- Bottom padding: 16px + safe area inset

### Side Padding Constants
- `ScreenSideOffset.small` = 16px
- `ScreenSideOffset.medium` = 28px
- `ScreenSideOffset.large` = 44px

### Keyboard Behavior
- Sheet removes bottom padding when keyboard is visible
- Active input scrolls into view with 120px scroll padding
- `KeyboardDismissOnTap` — tapping outside any input dismisses keyboard

---

## Screen 1: Profile Setup

**Figma node:** `38047:145325` (initial), plus variants for each state
**Status:** DONE — `packages/onboarding-ui/src/screens/ProfileSetupScreen.tsx`

### Purpose
Collect the user's display name, nickname, referral source, and profile photo.

### Layout
- Sheet with drag handle
- Auth header: ICE logo icon (65px circle, `primaryAccent` background) + title + subtitle
- Title: "Your profile" (headline1)
- Subtitle: "Customize your account" (body2, `tertiaryText`)
- Header side padding: 28px (ScreenSideOffset.medium)
- Content side padding: 44px (ScreenSideOffset.large)

### Components (top to bottom)

1. **AvatarPicker** (20px top padding, 28px bottom to first field)
   - Size: 100px x 100px, border radius 20px
   - Empty state: dashed border placeholder
   - Camera button: 36px circle, `primaryAccent` background, positioned bottom-right with -6px offset
   - Loading state: spinner overlay while image processes
   - Taps opens media picker (requires photos permission)
   - NSFW check before submission

2. **Name input** (max 50 chars)
   - Prefix icon: `field-name`
   - Live validation — shows green checkmark when valid
   - Error: "Cannot be empty"

3. **Nickname input** (max 20 chars, lowercase only) — 16px gap from previous
   - Prefix icon: `at-sign`
   - Debounced validation: 1 second delay, then API check
   - Errors: "Only letters, numbers, and dots are allowed", "Nickname is already taken"
   - Reserved nickname: opens `NicknameReservedModal` as nested bottom sheet

4. **Referral input** (max 20 chars, optional) — 16px gap from previous
   - Prefix icon: `field-inviter`
   - Debounced validation: 1 second delay
   - Clipboard suggestion: on first focus, checks clipboard for valid nickname, offers to paste
   - Error: "Nickname doesn't exist"

5. **Save button** — 26px gap from last field, 40px bottom padding + safe area
   - Full width, height 56
   - Trailing icon: `profile-save`
   - Disabled (gray) when name or nickname is empty
   - Shows loading spinner while avatar compresses or form submits

### States

| State | Avatar | Fields | Button | Header |
|---|---|---|---|---|
| Initial (empty) | Dashed placeholder | All empty, gray borders | Disabled (gray) | Full: logo + title + subtitle |
| Keyboard open | Unchanged | Active field: blue border, floating label | Depends on validity | Compact: title only, fades in on scroll |
| Field valid | Unchanged | Green border + green checkmark suffix | Depends on other fields | Full |
| All valid + photo | User photo | All green borders + checkmarks | Active (blue) | Full |
| Validation error | Unchanged | Red border, error text replaces label | Active (blue) | Full |
| Submitting | May show spinner | Readonly | Loading spinner | Full |

### Nickname Reserved Modal
- Triggered by `NicknameReservedException` from validation
- Separate bottom sheet overlay on top of profile sheet
- Dark overlay dims the profile screen behind it
- Icon: `name-reserved` (@ with checkmark badge)
- Title: "Nickname is reserved"
- Body: explains to email hi@ice.io from company email to claim
- Close (X) button in top-right

### Input Field Component (`TextInput` — goes in `@ion/ui`)

All profile inputs share a consistent design:

| State | Border Color | Label | Prefix Icon | Suffix |
|---|---|---|---|---|
| Empty | `strokeElements` | Placeholder text (`tertiaryText`) | Icon (`secondaryText`) | None |
| Focused | `primaryAccent` | Floats above as small label | Icon | Cursor |
| Valid | `success` | Floats above as small label | Icon | Green checkmark icon |
| Error | `attentionRed` | Error text replaces floating label | Icon | None |

- Vertical separator line between prefix icon and text area
- Content padding: 13px vertical, 16px horizontal
- Cursor color: `primaryAccent`
- Tap outside dismisses focus

### Transition
- Save succeeds -> pushes Select Languages screen
- Back arrow (when visible) -> signs out / exits onboarding

---

## Screen 2: Select Languages

**Figma node:** `21632:117234`
**Status:** TODO

### Purpose
Let the user choose which language(s) they want content displayed in.

### Layout
- Sheet with drag handle + back arrow + title
- Title: "Select languages" (headline1)
- Subtitle: "You'll be shown content in the selected language" (body2, `tertiaryText`)
- Top content padding: 34px

### Components

1. **SearchBar** — collapses/expands with scroll (collapsing app bar pattern)
   - Magnifying glass icon
   - Side padding: 16px (ScreenSideOffset.small)
   - Collapse offset: 8px from top when collapsed

2. **Language list** (26px gap below search)
   - Scrollable, separated by 12px between items
   - Selected languages sort to top
   - Search filters in real-time
   - Each row: `CheckboxRow` component

3. **Continue button** — pinned bottom bar
   - Only visible when at least one language is selected
   - HorizontalSeparator above
   - Full width, 16px side padding + 16px bottom + safe area
   - Shows loading spinner during save

### CheckboxRow Component

- Container: height 44px, `primaryBackground` background, 12px border radius
- Layout: flag emoji (18px font) | 16px gap | language name (`subtitle2`, `primaryText`) | checkbox icon
- Checkbox: `checkbox-on` (green, selected) / `checkbox-off` (unselected)
- Full-width tap target to toggle

### States
- At least one language must be selected
- Multiple selection allowed
- Continue button hidden until selection exists

### Transition
- Continue -> pushes Discover Creators
- Back arrow -> returns to Profile Setup

---

## Screen 3: Discover Creators

**Status:** TODO

### Purpose
Suggest popular creators for the user to follow during onboarding.

### Layout
- Sheet with drag handle + back arrow + title
- Title: "Discover creators" (headline1)
- Subtitle: "Connect with visionaries and inspiring voices" (body2, `tertiaryText`)
- Top content padding: 34px

### Components

1. **Creator list** — scrollable, paginated (load more on scroll)
   - Separated by 8px between items
   - Each row: `CreatorRow` component

2. **Continue button** — pinned bottom bar
   - Always enabled (following is optional)
   - HorizontalSeparator above
   - Full width

### CreatorRow Component

- Container: `tertiaryBackground` background, 16px border radius, 12px padding all sides
- Layout: circular avatar (left) | name + verified badge + @handle (center) | follow button (right)
- Name: `body` variant, verified badge: blue checkmark inline
- Handle: `caption2`, `secondaryText`

### Follow Button (uses `SmallButton` from `@ion/ui`)

| State | Background | Border | Text/Icon Color |
|---|---|---|---|
| Follow | `primaryAccent` fill | None | `onPrimaryAccent` |
| Following | Transparent | `primaryAccent` 1px | `primaryAccent` |

- Icon: `person-add` (follow) / `person-following` (following)
- Border radius: 16px
- Padding: 14px horizontal, 4px vertical
- Animated transition: 250ms ease-in-out

### Loading State
- Before data loads: 5 skeleton placeholder rows with shimmer animation
- Shimmer colors: `primaryBackground` -> `secondaryBackground`

### Transition
- Continue -> triggers onboarding completion flow (passkey verification, relay assignment, metadata upload, follow all selected creators) -> pushes Notifications screen (or finishes)
- Back arrow -> returns to Select Languages

---

## Screen 4: Turn on Notifications

**Figma node:** `22042:47917`
**Status:** TODO

### Purpose
Encourage the user to enable push notifications with example previews.

### Layout
- Sheet with drag handle (no back arrow — this is the final step)
- Title: "Turn on notifications" (headline1)
- Subtitle: "Receive notifications when you transfer and receive funds" (body2, `tertiaryText`)
- Top content padding: 28px
- Shown via UI event system — appears after onboarding completion

### Components

1. **Notification preview cards** — 3 cards, separated by 8px

   Each `NotificationCard`:
   - Background: `primaryAccent`, 16px border radius, 12px padding
   - Layout: avatar 36px (left) | title + description + time (right, in 43px left-padded container)
   - Title: `body` variant, `secondaryBackground` color (white on blue)
   - Description: `caption3` variant, `secondaryBackground` color
   - Time: `caption3` variant, `tertiaryBackground` color (dimmer), right-aligned

   Cards content:
   | # | Title | Description | Time |
   |---|---|---|---|
   | 1 | "Sent ICE" (+ verified badge) | "You sent 12.43 ICE to @james" | "15m ago" |
   | 2 | "New follower" | "@curtis has started following you" | "24m ago" |
   | 3 | "New message" | "@marie has sent you a message" | "31m ago" |

2. **Benefit descriptions** — 24px gap below cards, separated by 20px between items

   Each `DescriptionItem`:
   - Layout: icon 27px (left, vertically centered, 10px right padding) | text (expanded)
   - Icon color: `primaryText`
   - Text: `body2` variant, `secondaryText` color

   Items:
   | # | Icon | Text |
   |---|---|---|
   | 1 | `clock` | "Receive notifications when your sending or receiving assets" |
   | 2 | `news` | "Stay up to date with the latest news" |
   | 3 | `chat-bubble` | "Chat and receive notifications even if the application is closed" |

3. **Continue button** — 24px gap below descriptions
   - Full width
   - Tapping triggers OS push notification permission dialog
   - After grant or deny -> navigates to main app (pops back to feed)

### Transition
- Continue -> requests notification permission -> navigates to main feed
- This screen is terminal — no back navigation

---

## Shared UI Components Summary

### Implemented in `@ion/ui` (reusable across app)

| Component | Props (key) | Used By |
|---|---|---|
| **BottomSheet** | `isVisible`, `onClose`, `title?`, `onBack?`, `bottomButton?` | All 4 screens |
| **TextInput** | `value`, `onChangeText`, `placeholder`, `prefixIcon?`, `state?`, `errorMessage?`, `debounceMs?` | Profile Setup |
| **TextField** | `label`, `value?`, `onChangeText?`, `state?`, `errorMessage?`, `prefixIcon?`, `suffixIcon?`, `isClearable?`, `hasPrefixDivider?` | Available for future use |
| **SearchBar** | `value`, `onChangeText`, `placeholder?` | Select Languages |
| **HorizontalSeparator** | `style?` | All screens (bottom bar) |
| **Button** | `label?`, `icon?`, `isLoading?`, `isDisabled?`, `color?`, `height?` | All screens (continue/save) |
| **SmallButton** | `label?`, `icon?`, `color?` ("primary", "primaryOutlined") | Discover Creators (follow) |
| **Text** | `variant?`, `color?` | All screens |
| **Box** | extends `ViewProps` | All screens |
| **Icon** | `name`, `size?`, `color` | All screens |

### Implemented in onboarding package

| Component | Status | Location |
|---|---|---|
| **AvatarPicker** | DONE | `packages/onboarding-ui/src/components/` |
| **AuthHeader** | DONE | `packages/onboarding-ui/src/screens/` |
| **NicknameReservedModal** | DONE | `packages/onboarding-ui/src/components/` |
| **ProfileSetupFields** | DONE | `packages/onboarding-ui/src/screens/` |
| **CheckboxRow** | TODO | `packages/onboarding-ui/src/components/` |
| **CreatorRow** | TODO | `packages/onboarding-ui/src/components/` |
| **NotificationCard** | TODO | `packages/onboarding-ui/src/components/` |
| **DescriptionItem** | TODO | `packages/onboarding-ui/src/components/` |

### Note: TextInput vs TextField

`@ion/ui` exports two text input components:
- **TextInput** — simpler API, used by Profile Setup. Has `prefixIcon` (IconName), `state`, `debounceMs`.
- **TextField** — richer API from PR #11. Has `label`, `isClearable`, `hasPrefixDivider`, `suffixIcon` (ReactNode), multiline support, secure text entry.

Profile Setup currently uses `TextInput`. Both are available for remaining screens.

---

## Design Tokens (from Figma variables + codebase `@ion/ui`)

The onboarding screens use the same token system already implemented in `packages/ui/src/tokens/`.
Values below are pulled from Figma variable definitions and match the codebase.

### Colors (Figma variable -> codebase mapping)

| Figma Variable | Hex | Codebase Token |
|---|---|---|
| Primary Accent | #0166FF | `colors.primaryAccent` |
| On Primary Accent | #FFFFFF | `colors.onPrimaryAccent` |
| Primary Text | #0E0E0E | `colors.primaryText` |
| Secondary Text | #494949 | `colors.secondaryText` |
| Tertiary Text | #9A9A9A | `colors.tertiaryText` |
| Secondary Background | #FFFFFF | `colors.secondaryBackground` |
| Primary Background | #F5F7FF | `colors.primaryBackground` |
| Tertiary Background | #FAFBFF | `colors.tertiaryBackground` |
| Background Sheet | #081532b2 | `colors.backgroundSheet` (overlay) |
| On Tertiary Fill | #E1EAF8 | `colors.onTertiaryFill` |
| Stroke Elements | #CCCCCC | `colors.strokeElements` |
| Sheet Line | #B8BCCA | `colors.sheetLine` |
| Success | #35D487 | `colors.success` |
| Attention Red | #FD4E4E | `colors.attentionRed` |

### Typography (Figma variable -> codebase mapping)

| Figma Variable | Size / Weight | Codebase Token |
|---|---|---|
| Mainnet/Headline 1 (700) | 28px / Bold | `typography.headline1` |
| Mainnet/Title (600) | 17px / SemiBold | `typography.title` |
| Mainnet/Subtitle (600) | 15px / SemiBold | `typography.subtitle` |
| Mainnet/Subtitle 2 (400) | 15px / Medium | `typography.subtitle2` |
| Mainnet/Subtitle 3 (400) | 14px / Medium | `typography.subtitle3` |
| Mainnet/Body (600) | 13px / SemiBold | `typography.body` |
| Mainnet/Body 2 (400) | 13px / Regular | `typography.body2` |
| Mainnet/Caption (500) | 12px / Medium | `typography.caption` |
| Mainnet/Caption 2 (400) | 12px / Regular | `typography.caption2` |
| Mainnet/Caption 3 (400) | 11px / Regular | `typography.caption3` |

Font family: **Noto Sans** (all variants)

### Spacing & Radius (from `packages/ui/src/tokens/spacing.ts`)

| Token | Value |
|---|---|
| `spacing.xxs` | 2px |
| `spacing.xs` | 4px |
| `spacing.sm` | 8px |
| `spacing.md` | 12px |
| `spacing.lg` | 16px |
| `spacing.xl` | 20px |
| `spacing.xxl` | 24px |
| `spacing.xxxl` | 32px |
| `radii.small` | 8px |
| `radii.medium` | 12px |
| `radii.large` | 16px |

All values are scaled by `theme.scale.scaleSize()` relative to base design width of 375px.

### Screen-Specific Spacing

| Context | Value | Notes |
|---|---|---|
| Sheet top radius | 30px | Larger than standard `radii.large` — custom value |
| Drag handle | 50px x 3px | Centered, `sheetLine` color |
| Auth header icon | 65px circle | `primaryAccent` background |
| Avatar size | 100px x 100px | 20px border radius |
| Camera button | 36px circle | -6px offset from avatar corner |
| Input scroll padding | 120px | Keeps active input visible above keyboard |
| Title fade start | scroll 120px | 0 opacity |
| Title fade end | scroll 140px | 1 opacity |
| Side padding (content) | 44px | Profile fields |
| Side padding (buttons) | 16px | Bottom bar buttons |
| Side padding (header) | 28px | Title/subtitle text |
