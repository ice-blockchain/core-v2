# @ion/navigation

> Navigation, routing, deep linking, and modal infrastructure for ION.

---

## Decision Log

| Decision | Rationale | Date |
|---|---|---|
| React Navigation (not Expo Router) | Not on Expo. RN bare workflow. React Navigation has first-class web support via react-native-web. | 2026-03-30 |
| `@gorhom/bottom-sheet` v5 for all modals | Pull-to-close, snap points, modal stacking, keyboard avoidance. Supports native + mobile web. Single library, single API. Fully replaces custom `@ion/ui` BottomSheet. | 2026-03-30 |
| Separate `@ion/navigation` package | Navigation is Feature-layer infrastructure consumed by all screens. Keeps route definitions, modal configs, and linking out of app shell. | 2026-03-30 |
| Next.js routing stays separate | Web app uses Next.js file-based routing. `@ion/navigation` provides shared route names and deep link configs that both RN and Next.js can consume. | 2026-03-30 |
| Real stack inside sheet, reset at gates | Inside the bottom sheet, screens push onto a real stack (back preserves state). Two one-way gates use `reset`: Splash -> GetStarted (no back to splash) and Onboarding completion -> Catalog (no back to onboarding). | 2026-03-30 |

---

## Layer Position

```text
App (screens)
  |
Actions (@ion/actions)
  |
Features <--- @ion/navigation lives here, alongside deep-links, push-notifications
  |
Clients
  |
Media
  |
Foundation
```

`@ion/navigation` can import from: Foundation (`@ion/platform`, `@ion/config`, `@ion/storage`).
`@ion/navigation` cannot import from: Actions, Clients, Media, or Screens.

Screens import `@ion/navigation` for: navigator components, route types, modal presentation, deep link handling.

---

## Dependencies

| Dependency | Purpose |
|---|---|
| `@react-navigation/native` | Core navigation runtime |
| `@react-navigation/native-stack` | Stack navigator (screen-to-screen transitions) |
| `@react-navigation/bottom-tabs` | Tab navigator (main app tabs — future) |
| `react-native-screens` | Native screen containers for performance |
| `react-native-safe-area-context` | Safe area insets (already used across the app) |
| `@gorhom/bottom-sheet` | Bottom sheet modals with gesture dismiss |
| `react-native-gesture-handler` | Required by gorhom + React Navigation (already installed via media-viewer) |
| `react-native-reanimated` | Required by gorhom + React Navigation (already installed via media-viewer) |

---

## Screen Flow

```text
SplashScreen ──reset──> GetStartedScreen ──push──> [BottomSheet opens]
                        (full screen)                     │
                        (no back to splash)               │
                                                          ▼
                                          ┌─────────────────────────────┐
                                          │   Single Bottom Sheet       │
                                          │   (gorhom, snap: ["92%"])   │
                                          │                             │
                                          │   Screens slide inside:     │
                                          │                             │
                                          │   Register                  │
                                          │     ↓ push (within sheet)   │
                                          │   ProfileSetup              │
                                          │     ↓ push (within sheet)   │
                                          │   SelectLanguages           │
                                          │     ↓ push (within sheet)   │
                                          │   DiscoverCreators          │
                                          │     ↓ push (within sheet)   │
                                          │   Notifications             │
                                          │                             │
                                          │   ┌───────────────────┐     │
                                          │   │ NicknameReserved  │     │
                                          │   │ (pushes OVER as   │     │
                                          │   │  separate gorhom  │     │
                                          │   │  modal on top)    │     │
                                          │   └───────────────────┘     │
                                          └─────────────────────────────┘
                                                          │
                                                  sheet dismisses
                                                          │
                                                       reset
                                                          │
                                                          ▼
                                                   CatalogScreen
                                                   (full screen)
                                                (no back to onboarding)
```

### Screen Details

| # | Screen | Presentation | Back Behavior |
|---|---|---|---|
| 1 | **SplashScreen** | Full screen. Plays `logo_static.mp4` once. Auto-advances when video completes (or 2s timeout). | N/A (entry point) |
| 2 | **GetStartedScreen** | Full screen. Plays `intro.mp4` looping as background. CTA button ("Log In") at bottom. Reached via `reset` — no back to Splash. | No back (splash is gone from stack) |
| 3 | **RegisterScreen** | Inside bottom sheet. Sheet opens on CTA tap from GetStarted. | Pull-to-close dismisses sheet, returns to GetStarted |
| 4 | **ProfileSetupScreen** | Slides within same bottom sheet (push inside sheet). | Back slides to Register within sheet |
| 5 | **SelectLanguagesScreen** | Slides within same bottom sheet. | Back slides to ProfileSetup within sheet |
| 6 | **DiscoverCreatorsScreen** | Slides within same bottom sheet. | Back slides to SelectLanguages within sheet |
| 7 | **NotificationsScreen** | Slides within same bottom sheet. | Back slides to DiscoverCreators within sheet |
| 8 | **CatalogScreen** | Full screen. Sheet dismisses, then `reset` to CatalogScreen — entire previous stack is cleared. | No back (one-way gate, stack is cleared) |

### NicknameReservedModal

Triggered from ProfileSetupScreen when a nickname conflict is detected. Presented as a **separate gorhom BottomSheetModal that pushes over** the existing sheet (modal on modal). Pull-to-close dismisses it back to ProfileSetup.

---

## Video Assets

Already present in the codebase:

| Asset | Location (mobile) | Location (web) | Usage |
|---|---|---|---|
| `logo_static.mp4` | `apps/mobile/assets/videos/` | `apps/web/public/videos/` | SplashScreen — plays once |
| `intro.mp4` | `apps/mobile/assets/videos/` | `apps/web/public/videos/` | GetStartedScreen — loops as background |

Android copies: `apps/mobile/android/app/src/main/assets/custom/`

---

## Navigator Structure

```text
GestureHandlerRootView
└── BottomSheetModalProvider
    └── NavigationContainer
        └── RootStack (native-stack, headerShown: false)
            ├── SplashScreen              (full screen)
            ├── GetStartedScreen          (full screen, video background)
            ├── CatalogScreen             (full screen, main app)
            └── ... (future: MainTabs)
```

The Register + Onboarding flow is NOT a React Navigation stack. It is a **gorhom BottomSheet with internal navigation**:

- GetStartedScreen opens a `BottomSheet` on CTA tap
- Inside the sheet: a nested `native-stack` navigator handles Register -> ProfileSetup -> SelectLanguages -> DiscoverCreators -> Notifications
- Back gesture within the sheet pops the internal stack (slide back to previous screen)
- Pull-to-close on the sheet dismisses the entire flow back to GetStartedScreen
- On completion (after Notifications), the sheet dismisses and RootStack navigates to CatalogScreen

### Why a nested stack inside the sheet (not separate sheets)

- One persistent sheet container = smooth transitions between steps
- Internal stack preserves state on back (form inputs, selections)
- Pull-to-close on the outer sheet = escape hatch from entire flow
- NicknameReservedModal is the only case of modal-over-modal (separate gorhom modal)

---

## Bottom Sheet Configuration

### Main Flow Sheet (Register + Onboarding)

| Property | Value | Notes |
|---|---|---|
| `snapPoints` | `["92%"]` | Near-full-screen sheet |
| `enablePanDownToClose` | `true` | Pull down to dismiss entire flow |
| `enableDynamicSizing` | `false` | Fixed snap point |
| `backdropComponent` | Custom, press-to-dismiss | Semi-transparent overlay over GetStarted video |
| `keyboardBehavior` | `"interactive"` | Sheet adjusts with keyboard |
| `handleIndicatorStyle` | Visible drag handle | Visual affordance for pull-to-close |

### NicknameReservedModal (modal over modal)

| Property | Value | Notes |
|---|---|---|
| `snapPoints` | `["40%"]` | Partial sheet over the main flow sheet |
| `enablePanDownToClose` | `true` | Pull down to dismiss back to ProfileSetup |
| `stackBehavior` | `"push"` | Pushes over the existing sheet |
| `backdropComponent` | Custom, press-to-dismiss | Dims the main flow sheet underneath |

### Snap Points Convention (general)

| Modal Type | Snap Points | Example |
|---|---|---|
| Small confirmation | `["25%"]` | "Are you sure?" dialogs |
| Action picker | `["40%", "70%"]` | Send tip, share options |
| Info modal | `["40%"]` | NicknameReservedModal |
| Form sheet | `["70%", "92%"]` | Profile edit, settings |
| Full sheet | `["92%"]` | Register + Onboarding flow |

---

## Route Definitions

```typescript
// src/routes.ts — route name constants
export const Routes = {
  Splash: "Splash",
  GetStarted: "GetStarted",
  Catalog: "Catalog",

  // These live inside the bottom sheet's nested navigator
  Sheet: {
    Register: "Sheet/Register",
    ProfileSetup: "Sheet/ProfileSetup",
    SelectLanguages: "Sheet/SelectLanguages",
    DiscoverCreators: "Sheet/DiscoverCreators",
    Notifications: "Sheet/Notifications",
  },

  // Future: main app tabs
  Main: {
    Feed: "Main/Feed",
    Discover: "Main/Discover",
    Wallet: "Main/Wallet",
    Chat: "Main/Chat",
    Profile: "Main/Profile",
  },
} as const;
```

```typescript
// src/route-params.ts — type-safe params
export type RootStackParamList = {
  [Routes.Splash]: undefined;
  [Routes.GetStarted]: undefined;
  [Routes.Catalog]: undefined;
};

// Nested navigator inside the bottom sheet
export type SheetStackParamList = {
  [Routes.Sheet.Register]: undefined;
  [Routes.Sheet.ProfileSetup]: undefined;
  [Routes.Sheet.SelectLanguages]: undefined;
  [Routes.Sheet.DiscoverCreators]: undefined;
  [Routes.Sheet.Notifications]: undefined;
};
```

---

## Custom BottomSheet Removal

The custom `BottomSheet` in `@ion/ui` will be **fully replaced** by `@gorhom/bottom-sheet`:

| Remove | Replace With |
|---|---|
| `packages/ui/src/components/BottomSheet.native.tsx` | `@gorhom/bottom-sheet` `BottomSheet` / `BottomSheetModal` |
| `packages/ui/src/components/BottomSheet.web.tsx` | `@gorhom/bottom-sheet` (supports mobile web) |
| `packages/ui/src/components/bottom-sheet-types.ts` | gorhom's built-in types |
| `packages/ui/src/components/bottom-sheet-styles.ts` | gorhom's built-in styling props |
| `packages/ui/src/components/bottom-sheet-hooks.ts` | gorhom's keyboard handling |
| `packages/ui/src/components/BottomSheetHeader.tsx` | Custom header inside sheet content |
| `packages/ui/src/components/BottomSheetFooter.tsx` | gorhom's `footerComponent` prop |
| `apps/mobile/src/components/bottom-sheet.tsx` | gorhom |
| `apps/web/src/components/bottom-sheet.tsx` | gorhom |
| `apps/mobile/src/components/sheet-handle.tsx` | gorhom's `handleIndicatorStyle` |
| `apps/web/src/components/sheet-handle.tsx` | gorhom's `handleIndicatorStyle` |

### NicknameReservedModal Migration

Current: Custom `View` + `Pressable` overlay passed as `overlay` prop to the custom BottomSheet.
Target: Standalone `BottomSheetModal` from gorhom, triggered via `ref.current?.present()` from ProfileSetupScreen. Pull-to-close dismisses it. No custom overlay code needed.

---

## Public API Surface

```typescript
// index.ts exports
export { Routes } from "./routes";
export type { RootStackParamList, SheetStackParamList } from "./route-params";
export { AppNavigator } from "./app-navigator";
export { useAppNavigation } from "./use-app-navigation";
export { SheetNavigator } from "./sheet-navigator";
```

---

## Migration Plan

### Phase 1: Install and scaffold
1. Install `@react-navigation/native`, `@react-navigation/native-stack`, `react-native-screens`
2. Install `@gorhom/bottom-sheet` v5
3. Create `routes.ts`, `route-params.ts`
4. Create `AppNavigator` (RootStack with Splash, GetStarted, Catalog)
5. Wire `GestureHandlerRootView` + `BottomSheetModalProvider` + `NavigationContainer` in App.tsx

### Phase 2: Full screens (Splash + GetStarted + Catalog)
1. SplashScreen: plays `logo_static.mp4`, resets to GetStarted on completion (no back)
2. GetStartedScreen: plays `intro.mp4` looping, CTA button opens the bottom sheet
3. CatalogScreen: existing `CatalogScreen` from `@ion/ui`, wired as final destination

### Phase 3: Bottom sheet flow (Register + Onboarding)
1. Create `SheetNavigator` — a gorhom `BottomSheet` containing a nested `native-stack`
2. Screens inside: Register -> ProfileSetup -> SelectLanguages -> DiscoverCreators -> Notifications
3. Back gesture = pop within nested stack (slide back, state preserved)
4. Pull-to-close on sheet = dismiss entire flow back to GetStarted
5. On Notifications completion: dismiss sheet, then `reset` to Catalog (clears entire stack — no back)

### Phase 4: NicknameReservedModal migration
1. Rewrite as a `BottomSheetModal` (gorhom) with snap point `["40%"]`
2. Triggered from ProfileSetupScreen via `ref.current?.present()`
3. Pull-to-close dismisses back to ProfileSetup
4. Remove the `overlay` prop pattern from old BottomSheet

### Phase 5: Cleanup
1. Remove custom BottomSheet from `@ion/ui` (all files listed above)
2. Remove local bottom-sheet components from `apps/mobile` and `apps/web`
3. Update `@ion/ui` exports
4. Update all imports across the codebase

### Phase 6: Future — Main App Shell
1. `@react-navigation/bottom-tabs` for MainTabs
2. Per-tab stacks for nested navigation
3. Deep linking integration

---

## Resolved Decisions

| Question | Answer | Notes |
|---|---|---|
| Sheet-internal back button | Yes, visible back buttons per Figma | Gestures supplement buttons, never replace them. Layout follows Figma designs. |
| Pull-to-close vs scroll | gorhom handles it | Use gorhom's `BottomSheetScrollView`, `BottomSheetFlatList`, or `BottomSheetFlashList` inside sheets. These integrate with the gesture system — scroll-to-top triggers pull-to-close automatically. |
| GetStarted CTA animation | scale-in, 2s delay | Use `react-native-reanimated` `withDelay(2000, withSpring(...))` for scale effect on the CTA button. |
| SplashScreen timeout | 2s fallback if video fails | If `logo_static.mp4` doesn't trigger `onEnd` within 2 seconds, auto-advance to GetStarted. |
| Sheet open animation | Default gorhom spring | No custom timing. Use gorhom's built-in spring animation. |
| Tab bar design (future) | Custom tab bar component | Will be designed in Figma. Use React Navigation's `tabBar` prop to render a custom component. |
| State persistence | No | Navigation state does not survive app restarts. Fresh start every launch. |
