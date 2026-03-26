# Screen 3: Discover Creators — Implementation Plan

## Context
Onboarding screen 3 of 4. Users browse suggested creators and follow/unfollow them before continuing. Follows established patterns from ProfileSetupScreen and SelectLanguagesScreen.

## Files to Create

### 1. `packages/onboarding-ui/src/screens/DiscoverCreatorsScreen.tsx`
- Props: `OnboardingScreenProps` (`onContinue`, `onBack`)
- `BottomSheet` with `onBack`, `title="Discover creators"`, `bottomButton={<Button label="Continue" />}`
- Title section: headline1 "Discover creators" + body2 subtitle in `tertiaryText`
- `FlatList` for creator list with `onEndReached` pagination, 8px item gap
- Loading state: render 5 `CreatorRowSkeleton` items
- Hook: `useDiscoverCreators` for state management

### 2. `packages/onboarding-ui/src/screens/discover-creators-hooks.ts`
- `useDiscoverCreators(onContinue)` hook
- State: `creators[]`, `followedIds: Set`, `isLoading`, `page`
- Actions: `toggleFollow(creatorId)`, `loadMore()`, `handleContinue()`
- Calls stubbed `fetchSuggestedCreators`, `followCreator`, `unfollowCreator` from `@ion/onboarding`

### 3. `packages/onboarding-ui/src/screens/discover-creators-styles.ts`
- `buildTitleContainerStyle(scale)` — centered, 8px gap, 16px paddingTop (matches SelectLanguagesScreen pattern)
- `buildListContainerStyle(scale)` — 34px paddingTop, full width
- `buildListContentStyle(scale)` — 8px gap, bottom padding for button clearance

### 4. `packages/onboarding-ui/src/components/CreatorRow.tsx`
- Props: `{ avatarUrl, name, handle, isVerified, isFollowing, onToggleFollow }`
- Layout: `tertiaryBackground`, 16px borderRadius, 12px padding, row with space-between
- Left: avatar (30px, borderRadius 10px as per Figma) + name row (name + verified badge icon) + @handle
- Right: `SmallButton` — Follow (`color="primary"`, icon=follow SVG, label "Follow") / Following (`color="primaryOutlined"`, icon=following SVG, label "Following")
- Name: `Text variant="body"` (14px medium), handle: `Text variant="caption"` (12px medium) in `tertiaryText`

### 5. `packages/onboarding-ui/src/components/CreatorRowSkeleton.tsx`
- 5 skeleton rows matching CreatorRow dimensions
- Shimmer animation: `primaryBackground` -> `secondaryBackground`
- Animated opacity or linear gradient for shimmer effect

## Files to Modify

### 6. `packages/onboarding/src/index.ts` — add exports for new stubs
### 7. `packages/onboarding/src/types.ts` — add Creator types

New action stubs (TODO bodies):
- `packages/onboarding/src/fetch-suggested-creators.ts` — returns `Creator[]` with pagination
- `packages/onboarding/src/follow-creator.ts`
- `packages/onboarding/src/unfollow-creator.ts`
- `packages/onboarding/src/complete-onboarding.ts`

### 8. `packages/onboarding-ui/src/index.ts` — add `DiscoverCreatorsScreen` export

## Assets to Download from Figma REST API

All 3 icons must be downloaded as SVGs from the Figma REST API (`https://api.figma.com/v1/images/{fileKey}?ids={nodeId}&format=svg`). Use the Figma API token from MCP config.

### 1. badge-verify icon
- Figma node: `22514:87570` (icon/badge_verify) in file `3TnZngoFeklOVC8TexlR1D`
- Does NOT exist in icon registry
- Save to: `packages/ui/src/icons/assets/icon_badge-verify.svg`
- Register in `packages/ui/src/icons/icon-registry.ts`
- Add to `packages/ui/src/icons/icon-types.ts`

### 2. Follow icon (person-add / search_follow)
- Figma node: `I22514:87584;42809:147739` or parent component node for `icon/search_follow`
- Icon shows a person silhouette with a "+" — used in the Follow button
- Save to: `packages/ui/src/icons/assets/icon_person-add.svg` (REPLACE existing if different from Figma)
- Already registered as `person-add` in icon registry — verify SVG matches Figma export

### 3. Following icon (person-following / search_followers)
- Figma node: `I22514:87573;42809:147793` or parent component node for `icon/search_followers`
- Icon shows a person silhouette with a checkmark — used in the Following button
- Save to: `packages/ui/src/icons/assets/icon_person-following.svg` (REPLACE existing if different from Figma)
- Already registered as `person-following` in icon registry — verify SVG matches Figma export

**Process:** Use Figma REST API to get SVG download URLs, then `curl` to download each SVG file. Compare existing person-add/person-following SVGs with Figma exports and replace if they differ.

## Existing Code to Reuse

- `SmallButton` from `@ion/ui` (`packages/ui/src/components/SmallButton.tsx`) — for follow/unfollow button
- `Icon` from `@ion/ui` — for `person-add`, `person-following`, `badge-verify` icons
- `BottomSheet` from `@ion/ui` — `bottomButton` slot pattern (same as ProfileSetupScreen:43)
- `Button` from `@ion/ui` — for Continue button
- `Text` from `@ion/ui` — typography variants
- `useTheme` from `@ion/ui` — theme colors and scale
- `OnboardingScreenProps` from `../types` (`packages/onboarding-ui/src/types.ts`)
- Style builder pattern from `select-languages-styles.ts`

## Implementation Order

1. Download all 3 SVG icons from Figma REST API, add/update icon assets and registry
2. Create action stubs in `@ion/onboarding` (types + 4 stub files + exports)
3. Create `CreatorRow.tsx` component
4. Create `CreatorRowSkeleton.tsx` component
5. Create `discover-creators-styles.ts`
6. Create `discover-creators-hooks.ts`
7. Create `DiscoverCreatorsScreen.tsx`
8. Update `packages/onboarding-ui/src/index.ts` to export new screen

## Verification
- Start web dev server via `preview_start`
- Navigate to discover creators screen
- `preview_screenshot` to compare against Figma
- Verify follow/unfollow toggle works
- Verify skeleton loading state renders
- Verify Continue button is always enabled
