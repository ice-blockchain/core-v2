# Navigation Implementation — Session Prompts

> Each prompt is a self-contained session. Copy-paste into a new Claude session.
> Execute in order. Each session assumes the previous one is complete and merged.
> Always reference `packages/navigation/ARCHITECTURE.md` for design decisions.

---

## Session 1: Dependencies and package scaffold

```
Read packages/navigation/ARCHITECTURE.md for full context.

Install navigation dependencies in the monorepo:
- @react-navigation/native
- @react-navigation/native-stack
- react-native-screens
- @gorhom/bottom-sheet v5

react-native-gesture-handler and react-native-reanimated are already installed
via media-viewer — verify they're accessible from the navigation package (peer deps).

In packages/navigation/:
1. Create src/routes.ts with the Routes constant (Splash, GetStarted, Catalog, Sheet.*)
2. Create src/route-params.ts with RootStackParamList and SheetStackParamList types
3. Update src/index.ts to export routes and types
4. Ensure package.json has correct peer dependencies
5. Run lint and type-check: pnpm --filter @ion/navigation lint && pnpm --filter @ion/navigation type-check

Do NOT create navigator components yet. This session is just the foundation:
dependencies, route definitions, and types.
```

---

## Session 2: App shell with React Navigation

```
Read packages/navigation/ARCHITECTURE.md for full context.
Read apps/mobile/App.tsx to understand the current state-based navigation.

Create the root navigator in packages/navigation/:
1. Create src/app-navigator.tsx — RootStack (native-stack) with three screens:
   - Splash
   - GetStarted
   - Catalog
   screenOptions: { headerShown: false, animation: "fade" }

2. Create src/use-app-navigation.ts — typed navigation hook wrapping
   useNavigation() with RootStackParamList

3. Export AppNavigator and useAppNavigation from index.ts

4. Update apps/mobile/App.tsx:
   - Wrap with GestureHandlerRootView (from react-native-gesture-handler)
   - Wrap with BottomSheetModalProvider (from @gorhom/bottom-sheet)
   - Wrap with NavigationContainer (from @react-navigation/native)
   - Render <AppNavigator /> instead of the current useState phase management
   - Keep ThemeProvider and SafeAreaProvider in place

5. For now, use placeholder components for each screen:
   - Splash: just a View with the app's background color
   - GetStarted: just a View with a "Log In" button that logs to console
   - Catalog: render the existing CatalogScreen from @ion/ui

The goal is: app launches -> shows Splash placeholder -> you can manually
navigate to GetStarted -> you can manually navigate to Catalog. No videos,
no bottom sheets yet. Just proving React Navigation works end to end.

Run lint, type-check. Test on iOS simulator and mobile web.
```

---

## Session 3: SplashScreen with video

```
Read packages/navigation/ARCHITECTURE.md — specifically the video assets
and splash screen sections.
Read the Flutter splash implementation at:
  /Users/user/Development/code/flutter/flutter-app/lib/app/features/core/views/pages/splash_page.dart
for reference on behavior (not code — just the UX pattern).

Video assets already exist at apps/mobile/assets/videos/logo_static.mp4

Create or update the SplashScreen:
1. Full screen, white background
2. Play logo_static.mp4 centered, plays once (no loop)
3. When video completes (onEnd): reset navigation to GetStarted
   (navigation.reset({ index: 0, routes: [{ name: Routes.GetStarted }] }))
   This is a one-way gate — no back to Splash.
4. Fallback: if video doesn't trigger onEnd within 2 seconds, auto-advance
   to GetStarted anyway (setTimeout as safety net, clear on unmount)
5. Show a static logo/placeholder if the video fails to load entirely

The screen should live in packages/onboarding-ui or a new appropriate
location following the project's package structure. The navigator in
@ion/navigation just references it.

Run lint, type-check. Test on iOS simulator — should see video play then
auto-transition to GetStarted.
```

---

## Session 4: GetStartedScreen with video background and CTA

```
Read packages/navigation/ARCHITECTURE.md — GetStarted screen details.
Read the Flutter intro page at:
  /Users/user/Development/code/flutter/flutter-app/lib/app/features/auth/views/pages/intro_page/intro_page.dart
for reference on behavior.

Video asset: apps/mobile/assets/videos/intro.mp4

Create the GetStartedScreen:
1. Full screen with intro.mp4 playing as looping background video
2. CTA button at the bottom ("Log In" or per localization)
3. CTA button has a scale-in animation: starts invisible, after 2 seconds
   scales in with a spring animation.
   Use react-native-reanimated: withDelay(2000, withSpring(...)) for the scale.
4. CTA button tap: for now, just log "open sheet" to console.
   The bottom sheet integration comes in the next session.
5. White fallback background with logo if video fails to load

Follow localization rules — all strings through translate() from @ion/localization.
Follow file size rules — keep under 250 lines, split if needed.

Run lint, type-check. Test on iOS simulator — should see looping video
with animated CTA button appearing after 2 seconds.
```

---

## Session 5: Bottom sheet with nested stack navigator (SheetNavigator)

```
Read packages/navigation/ARCHITECTURE.md — specifically:
- Navigator Structure
- Bottom Sheet Configuration (Main Flow Sheet)
- "Why a nested stack inside the sheet"

This is the core architectural piece. Create SheetNavigator in
packages/navigation/:

1. Create src/sheet-navigator.tsx:
   - A gorhom BottomSheet component (not BottomSheetModal) with:
     snapPoints: ["92%"]
     enablePanDownToClose: true
     enableDynamicSizing: false
     keyboardBehavior: "interactive"
     Custom backdrop: semi-transparent, press-to-dismiss
     Visible handle indicator
   - Inside the sheet: a React Navigation native-stack navigator
   - Screens registered: Register, ProfileSetup, SelectLanguages,
     DiscoverCreators, Notifications
   - Initial route: Register
   - Stack screenOptions: { headerShown: false, animation: "slide_from_right" }

2. The SheetNavigator is controlled via a ref (BottomSheet ref):
   - Export a way for GetStartedScreen to open the sheet
     (ref.current?.snapToIndex(0) or expand())
   - Export a way for NotificationsScreen to dismiss the sheet
     (ref.current?.close())

3. When sheet is dismissed (onClose callback):
   - Reset the internal stack back to Register (so reopening starts fresh)

4. Wire into GetStartedScreen:
   - CTA button tap -> opens the SheetNavigator
   - SheetNavigator renders over GetStartedScreen (video still playing behind)

5. For now, use placeholder Views for all 5 sheet screens. Each one has:
   - A title showing which screen it is
   - A "Continue" button that pushes to the next screen in the stack
   - A "Back" button that pops (except Register which has no back)

6. NotificationsScreen "Continue" button:
   - Dismiss sheet
   - Reset RootStack to Catalog (one-way gate)

Test the full flow: Splash -> GetStarted -> tap CTA -> sheet opens ->
Register -> ProfileSetup -> SelectLanguages -> DiscoverCreators ->
Notifications -> sheet closes -> Catalog. Also test: back within sheet,
pull-to-close on sheet.

Run lint, type-check.
```

---

## Session 6: Wire real screen components into SheetNavigator

```
Read packages/navigation/ARCHITECTURE.md for the screen inventory.

The SheetNavigator from Session 5 has placeholder screens. Now wire in
the real screen components.

Important: The existing screens (RegisterScreen, ProfileSetupScreen, etc.)
currently use the custom @ion/ui BottomSheet as their container. They need
to be refactored to render just their CONTENT — the sheet container is now
provided by SheetNavigator (gorhom).

For each screen:

1. RegisterScreen (packages/auth-ui/src/register-screen.tsx):
   - Remove any BottomSheet wrapper — just render the form content
   - onContinue callback -> navigate to Sheet/ProfileSetup
   - Scrollable content: use BottomSheetScrollView from @gorhom/bottom-sheet

2. ProfileSetupScreen (packages/onboarding-ui/src/screens/ProfileSetupScreen.tsx):
   - Remove BottomSheet wrapper — just render the form content
   - Remove the overlay prop usage (NicknameReservedModal handled in Session 7)
   - onContinue -> navigate to Sheet/SelectLanguages
   - onBack -> navigation.goBack()
   - Use BottomSheetScrollView for scrollable content

3. SelectLanguagesScreen (packages/onboarding-ui/src/screens/SelectLanguagesScreen.tsx):
   - Remove BottomSheet wrapper
   - onContinue -> navigate to Sheet/DiscoverCreators
   - onBack -> navigation.goBack()
   - Use BottomSheetFlatList or BottomSheetFlashList for the language list

4. DiscoverCreatorsScreen (packages/onboarding-ui/src/screens/DiscoverCreatorsScreen.tsx):
   - Remove BottomSheet wrapper
   - onContinue -> navigate to Sheet/Notifications
   - onBack -> navigation.goBack()
   - Use BottomSheetFlatList or BottomSheetFlashList for the creator list

5. NotificationsScreen (packages/onboarding-ui/src/screens/NotificationsScreen.tsx):
   - Remove BottomSheet wrapper
   - onContinue -> dismiss sheet + reset to Catalog
   - onBack -> navigation.goBack()
   - Use BottomSheetScrollView

Each screen should have a visible back button in its header (per Figma).
The back button calls navigation.goBack(). Register has no back button
(pull-to-close is the escape hatch).

Run lint, type-check. Test the full flow with real screens.
```

---

## Session 7: NicknameReservedModal migration to gorhom

```
Read packages/navigation/ARCHITECTURE.md — NicknameReservedModal section.
Read the current implementation:
  packages/onboarding-ui/src/components/NicknameReservedModal.tsx
  packages/onboarding-ui/src/components/nickname-reserved-styles.ts

Rewrite NicknameReservedModal as a gorhom BottomSheetModal:

1. Replace the current View + Pressable overlay with a BottomSheetModal:
   - snapPoints: ["40%"]
   - enablePanDownToClose: true
   - stackBehavior: "push" (pushes over the main flow sheet)
   - Custom backdrop with press-to-dismiss

2. In ProfileSetupScreen:
   - Create a BottomSheetModal ref
   - When nickname conflict detected: ref.current?.present()
   - When modal dismissed: ref.current?.dismiss()
   - Remove the old overlay prop pattern entirely

3. Delete nickname-reserved-styles.ts if no longer needed
   (gorhom handles sheet styling)

4. The modal content stays the same — just the container changes.
   Preserve all existing UI: icon, title, message, action buttons.

Test: go to ProfileSetup -> trigger nickname conflict -> NicknameReservedModal
slides up OVER the main sheet -> pull-to-close or tap dismiss -> returns
to ProfileSetup underneath. Verify the main sheet is still visible (dimmed)
behind the modal.

Run lint, type-check.
```

---

## Session 8: Remove custom BottomSheet and cleanup

```
Read packages/navigation/ARCHITECTURE.md — Custom BottomSheet Removal section
for the full list of files to remove.

All screens now use gorhom bottom sheets via SheetNavigator and
BottomSheetModal. Remove the old custom implementation:

1. Delete from packages/ui/src/components/:
   - BottomSheet.native.tsx
   - BottomSheet.web.tsx
   - bottom-sheet-types.ts
   - bottom-sheet-styles.ts
   - bottom-sheet-hooks.ts
   - BottomSheetHeader.tsx
   - BottomSheetFooter.tsx

2. Delete from apps/mobile/src/components/:
   - bottom-sheet.tsx
   - sheet-handle.tsx

3. Delete from apps/web/src/components/:
   - bottom-sheet.tsx
   - sheet-handle.tsx

4. Update packages/ui/src/index.ts:
   - Remove BottomSheet, BottomSheetHeader, BottomSheetFooter exports

5. Search the entire codebase for any remaining imports of the old
   BottomSheet from @ion/ui. Update or remove them all:
   grep -r "BottomSheet" --include="*.tsx" --include="*.ts" packages/ apps/

6. Search for any remaining references to the deleted files.

7. Remove the overlay prop pattern from any remaining screen that used it.

Run lint, type-check across ALL affected packages:
  pnpm --filter @ion/ui lint && pnpm --filter @ion/ui type-check
  pnpm --filter @ion/onboarding-ui lint && pnpm --filter @ion/onboarding-ui type-check
  pnpm --filter @ion/auth-ui lint && pnpm --filter @ion/auth-ui type-check

Test the full flow end-to-end. Nothing should reference the old BottomSheet.
```

---

## Session 9: Web app alignment

```
Read packages/navigation/ARCHITECTURE.md.
Read apps/web/src/app/ to understand the current Next.js routing.

The web app currently has its own routing via Next.js file-based routes
and its own local bottom-sheet components. Align it with the new system:

1. The RN screens (auth-ui, onboarding-ui) use react-native-web and can
   render in Next.js. The bottom sheets from gorhom support mobile web.

2. Update apps/web to:
   - Remove local bottom-sheet.tsx and sheet-handle.tsx (already deleted in Session 8)
   - Ensure GestureHandlerRootView and BottomSheetModalProvider are in the
     web app's root layout
   - Verify gorhom bottom sheet works in the web context (mobile web viewport)

3. The web app may keep Next.js routing for its own page structure, but
   the auth/onboarding flow should use the same SheetNavigator and screens
   as mobile.

4. Test on mobile web (Chrome DevTools mobile viewport): full flow
   Splash -> GetStarted -> sheet -> Register through Notifications -> Catalog

Run lint, type-check for the web app.
```
