# Onboarding Implementation Prompts

Copy-paste each prompt into a fresh Claude conversation. Run them in order.
Implementation conversations focus on writing code. Verification conversations (V) focus on visual QA against Figma.

---

## Global Rules for All Prompts

**Assets:** Download all icons and image assets directly from Figma using the REST API (`https://api.figma.com/v1/images/{fileKey}?ids={nodeId}&format=svg`). Use the Figma API token from MCP config. Never recreate or approximate assets — always pull the exact export from Figma.

**Checks and CI:** In these implementation prompts, you don't need to propose or run local lint, type-check, or tests unless the user explicitly asks for them — focus on writing code and downloading assets. However, do not change or disable any existing checks, and assume that all contributions must satisfy the project's normal lint/type-check/test and CI requirements as documented in `frontend/CLAUDE.md` and `08-testing.md`.

Analyze and let's have a plan. Ask clarification questions. 

---

## Conversation 4: Screen 3 — Discover Creators

```
Read `packages/onboarding-ui/onboarding.md` — specifically "Screen 3: Discover Creators".

Before writing code:
1. Read `packages/onboarding-ui/src/` for established patterns from Screens 1-2
2. Read `packages/ui/src/components/SmallButton.tsx` — props: `color` ("primary" | "primaryOutlined" | "danger" | "dangerOutlined"), `icon?`, `label?`, `isLoading?`, `isDisabled?`
3. Read `packages/ui/src/components/BottomSheet.tsx` for BottomSheet API

Implement in `packages/onboarding-ui/`:

**Screen: `DiscoverCreatorsScreen.tsx`**
- Props: `OnboardingScreenProps` (`onContinue`, `onBack`)
- `BottomSheet` with `onBack` and `title="Discover creators"`
- Subtitle: "Connect with visionaries and inspiring voices"
- Creator list: scrollable FlatList, paginated (`onEndReached`), 8px gap between items
- `Button` in `bottomButton` slot: "Continue", always enabled

**Component (onboarding-local):**
- `CreatorRow.tsx` — `tertiaryBackground`, 16px radius, 12px padding. Circular avatar + name with verified badge + @handle + `SmallButton` for follow/unfollow toggle.
  - Follow: `SmallButton` color="primary", icon `person-add`
  - Following: `SmallButton` color="primaryOutlined", icon `person-following`

**Loading state:** 5 skeleton rows with shimmer animation (`primaryBackground` -> `secondaryBackground`)

**Actions needed (stub with TODO if not yet implemented):**
- `fetchSuggestedCreators`, `followCreator`, `unfollowCreator`, `completeOnboarding`

Figma reference: use `get_design_context` on the Discover Creators frame within node `50256:221731` (file key `3TnZngoFeklOVC8TexlR1D`).
Download all icons/assets from Figma REST API — do not approximate.
Figma link for the screen - @https://www.figma.com/design/3TnZngoFeklOVC8TexlR1D/%F0%9F%A7%8A-ICE-Cloud?node-id=21632-117234&m=dev
```

---

## Conversation V4: Verify Screen 3 — Discover Creators

```
Read `packages/onboarding-ui/onboarding.md` for design specs.

Visual QA only. Compare the implemented Discover Creators screen against Figma and fix diffs.

Steps:
1. Start the web dev server via `preview_start`
2. Navigate to the creators onboarding screen
3. `preview_screenshot` the rendered screen
4. `get_screenshot` on the Discover Creators frame from Figma (file key `3TnZngoFeklOVC8TexlR1D`, node within `50256:221731`)
5. Compare: CreatorRow layout, avatar size, name/handle typography, follow button styling, spacing
6. `preview_inspect` to verify computed CSS values against tokens

Test interactions:
- Follow button toggles to Following state (SmallButton color="primaryOutlined")
- Following button toggles back to Follow (SmallButton color="primary")
- Skeleton loading state renders 5 shimmer rows before data loads
- Scroll to bottom triggers pagination (loads more creators)
- Continue button is always enabled
- Back arrow navigates back

Fix every diff until the screen matches Figma.
```

---

## Conversation 5: Screen 4 — Turn on Notifications

```
Read `packages/onboarding-ui/onboarding.md` — specifically "Screen 4: Turn on Notifications".

Before writing code:
1. Read `packages/onboarding-ui/src/` for established patterns from Screens 1-3
2. Read `packages/ui/src/components/BottomSheet.tsx` for BottomSheet API

Implement in `packages/onboarding-ui/`:

**Screen: `NotificationsScreen.tsx`**
- Props: `OnboardingScreenProps` (`onContinue` only — no back on this screen)
- `BottomSheet` with NO `onBack` (terminal screen), `title="Turn on notifications"`
- Subtitle: "Receive notifications when you transfer and receive funds"
- 3 `NotificationCard` components (8px gap)
- 3 `DescriptionItem` components (20px gap, 24px below cards)
- `Button` in `bottomButton` slot: "Continue", triggers notification permission then calls `onContinue`

**Components (onboarding-local):**
- `NotificationCard.tsx` — `primaryAccent` background, 16px radius, 12px padding. Avatar 36px + title (`Text` variant="body") + description (`Text` variant="caption3") + time (`Text` variant="caption3"). Text colors: `secondaryBackground` for title/description, `tertiaryBackground` for time.
- `DescriptionItem.tsx` — `Icon` size 27 (10px right padding) + `Text` variant="body2" color={colors.secondaryText}

**Actions needed (stub with TODO if not yet implemented):**
- `requestNotificationPermission`

Figma reference: use `get_design_context` on node `22042:47917` (file key `3TnZngoFeklOVC8TexlR1D`).
Download all icons/assets (notification avatars, benefit icons) from Figma REST API — do not approximate.
```

---

## Conversation V5: Verify Screen 4 — Turn on Notifications

```
Read `packages/onboarding-ui/onboarding.md` for design specs.

Visual QA only. Compare the implemented Notifications screen against Figma and fix diffs.

Steps:
1. Start the web dev server via `preview_start`
2. Navigate to the notifications onboarding screen
3. `preview_screenshot` the rendered screen
4. `get_screenshot` on Figma node `22042:47917` (file key `3TnZngoFeklOVC8TexlR1D`)
5. Compare: NotificationCard colors/layout/typography, DescriptionItem spacing, button placement
6. `preview_inspect` to verify computed CSS values against tokens

Test interactions:
- Continue button triggers notification permission prompt (or mock on web)
- No back arrow present
- Cards are static (no interaction)
- Benefit items render correctly with icons

Fix every diff until the screen matches Figma.
```

---

## Conversation 6: Navigation Wiring

```
Read `packages/onboarding-ui/onboarding.md` — specifically "Cross-Platform Strategy" and "Dependency Flow".
Read `packages/onboarding-ui/src/types.ts` — all screens use `OnboardingScreenProps` ({ onContinue, onBack? }).

All 4 onboarding screens are implemented in `packages/onboarding-ui/`. They are router-agnostic and receive `onContinue` / `onBack` callbacks as props.

Before writing code:
1. Read `apps/web/src/app.tsx` — current web app setup (currently toggles between CatalogScreen and ProfileSetupScreen)
2. Read `apps/mobile/src/` — current mobile app setup

Now wire them into both app shells:

**Mobile (`apps/mobile/`):**
1. Read existing navigation setup in `apps/mobile/src/`
2. Create `OnboardingNavigator.tsx` — React Navigation stack with 4 screens:
   - ProfileSetup -> SelectLanguages -> DiscoverCreators -> Notifications -> main app
3. Each screen's `onContinue` calls `navigation.navigate()` to the next screen
4. `onBack` calls `navigation.goBack()`
5. Final screen's `onContinue` navigates to the main app (replaces the stack)

**Web (`apps/web/`):**
1. Read existing routing setup in `apps/web/src/`
2. Create onboarding routes:
   - `/onboarding` -> ProfileSetupScreen
   - `/onboarding/languages` -> SelectLanguagesScreen
   - `/onboarding/creators` -> DiscoverCreatorsScreen
   - `/onboarding/notifications` -> NotificationsScreen
3. Each screen's `onContinue` navigates to the next route
4. `onBack` navigates to the previous route
5. Final screen redirects to `/` (main app)

Test the navigation flow on both platforms only if explicitly requested.
```
