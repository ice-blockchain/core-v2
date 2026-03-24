# @ion/permissions — Implementation Plan

## Context

`@ion/permissions` is a Foundation layer package for the ION app. It provides a unified API for checking, requesting, and observing OS/browser-level permissions (camera, photo library, microphone, notifications, cloud storage) across iOS, Android, and Web. Higher layers (media-acquisition, push-notifications, cloud-storage, actions) consume this package to gate feature access behind proper permission grants.

Cross-platform: the package runs on React Native (mobile) and React (web) via platform-specific file resolution (`.native.ts` / `.web.ts`).

### Scope

5 permission types covering all current and planned feature needs:

| Permission | Consumers |
|---|---|
| Camera | Story recording, QR scanner, media capture |
| Photos | Gallery picker, media sharing, profile photo |
| Microphone | Voice messages, story recording with audio |
| Notifications | Push notifications, onboarding prompt, settings |
| Cloud | iCloud backup (iOS), Google Drive backup (Android) |

8 status states covering all platform-specific responses:

| Status | Meaning | Platform |
|---|---|---|
| Granted | Full access | All |
| Denied | User denied, can ask again | All |
| Limited | Partial access (selected photos only) | iOS |
| PermanentlyDenied | Blocked, must change in settings | Mobile |
| Restricted | OS-level restriction (parental controls) | iOS |
| Provisional | Provisional approval (quiet notifications) | iOS |
| Unknown | Not yet checked | All |
| NotAvailable | Permission not supported on platform | All |

---

## File Structure

```
packages/permissions/
  src/
    types.ts                             # Enums, interfaces, config types
    types.test.ts
    permission-store.ts                  # In-memory state cache + pub/sub
    permission-store.test.ts
    refresh-permissions.ts               # Re-check all cached permissions
    refresh-permissions.test.ts
    use-permission.ts                    # React hook (shared — no platform deps)
    use-permission.test.ts
    permissions.ts                       # Orchestrator — public API
    permissions.test.ts
    platform/
      check-permission.ts               # Re-export (base — resolved by bundler)
      check-permission.native.ts        # RN: react-native-permissions check()
      check-permission.web.ts           # Web: navigator.permissions.query()
      check-permission.test.ts
      request-permission.ts             # Re-export (base)
      request-permission.native.ts      # RN: react-native-permissions request()
      request-permission.web.ts         # Web: getUserMedia / Notification.requestPermission
      request-permission.test.ts
      open-settings.ts                  # Re-export (base)
      open-settings.native.ts           # RN: react-native-permissions openSettings()
      open-settings.web.ts              # Web: no-op (browsers have no settings redirect)
      open-settings.test.ts
      map-native-status.ts              # Re-export (base)
      map-native-status.native.ts       # Map RN permission results to PermissionStatus
      map-native-status.web.ts          # Map browser PermissionState to PermissionStatus
      map-native-status.test.ts
  index.ts                               # Public API re-exports
  package.json
  tsconfig.json
```

Bundler resolution:
- **Metro (React Native):** resolves `.native.ts` files
- **Webpack/Next.js (Web):** resolves `.web.ts` files, falls back to `.ts`

---

## Public API

```typescript
// index.ts exports:
export { Permissions } from "./permissions";
export { usePermission } from "./use-permission";
export { PermissionType, PermissionStatus } from "./types";
export type { PermissionResult, PermissionsConfig, PermissionChangeListener } from "./types";
```

### Permissions (primary interface)

```typescript
Permissions.initialize(config?: PermissionsConfig): void
Permissions.check(type: PermissionType): Promise<PermissionResult>
Permissions.request(type: PermissionType): Promise<PermissionResult>
Permissions.ensurePermission(type: PermissionType): Promise<PermissionResult>
Permissions.checkAll(): Promise<Map<PermissionType, PermissionResult>>
Permissions.refreshAll(): Promise<void>
Permissions.getStatus(type: PermissionType): PermissionStatus
Permissions.isGranted(type: PermissionType): boolean
Permissions.isLimited(type: PermissionType): boolean
Permissions.isDenied(type: PermissionType): boolean
Permissions.isPermanentlyDenied(type: PermissionType): boolean
Permissions.openSettings(): Promise<void>
Permissions.subscribe(listener: PermissionChangeListener): () => void
```

### ensurePermission — Deny-to-Granted Convenience

`ensurePermission()` handles the full lifecycle of obtaining a permission, including the case where a user previously denied it and later wants to grant it.

```typescript
Permissions.ensurePermission(type: PermissionType): Promise<PermissionResult>
```

**Logic:**
1. Check current status
2. If `Granted` or `Limited` — return immediately
3. If `Denied` or `Unknown` — call `request()` to show the OS/browser prompt
4. If `PermanentlyDenied` — call `openSettings()`, then `refreshAll()` when app resumes, return fresh status
5. If `Restricted` or `NotAvailable` — return as-is (nothing can be done)

This replaces the boilerplate that every consumer would otherwise duplicate:
```typescript
// Without ensurePermission — consumer must handle every branch
const result = await Permissions.check(PermissionType.Camera);
if (result.status === PermissionStatus.Denied) {
  return await Permissions.request(PermissionType.Camera);
}
if (result.status === PermissionStatus.PermanentlyDenied) {
  await Permissions.openSettings();
  await Permissions.refreshAll();
  return { type: PermissionType.Camera, status: Permissions.getStatus(PermissionType.Camera) };
}

// With ensurePermission — single call handles all transitions
const result = await Permissions.ensurePermission(PermissionType.Camera);
```

**Platform behavior of the settings redirect step:**
- **Mobile:** `openSettings()` opens the app's OS settings page. `ensurePermission` awaits app resume (via AppState listener), then calls `refreshAll()` and returns the updated status.
- **Web:** `openSettings()` is a no-op. `ensurePermission` returns `PermanentlyDenied` as-is. The consumer should display instructional UI (e.g., "Click the lock icon in your address bar to change permissions").

### usePermission (React hook)

```typescript
function usePermission(type: PermissionType): {
  status: PermissionStatus;
  isGranted: boolean;
  isLimited: boolean;
  isPermanentlyDenied: boolean;
  request: () => Promise<PermissionResult>;
  check: () => Promise<PermissionResult>;
  ensure: () => Promise<PermissionResult>;
}
```

Subscribes to the permission store internally. Re-renders on status change. Cleans up subscription on unmount. Works on both mobile and web — no platform-specific code.

---

## Key Types

```typescript
enum PermissionType {
  Camera = "camera",
  Photos = "photos",
  Microphone = "microphone",
  Notifications = "notifications",
  Cloud = "cloud",
}

enum PermissionStatus {
  Granted = "granted",
  Denied = "denied",
  Limited = "limited",
  PermanentlyDenied = "blocked",
  Restricted = "restricted",
  Provisional = "provisional",
  Unknown = "unknown",
  NotAvailable = "not_available",
}

interface PermissionResult {
  type: PermissionType;
  status: PermissionStatus;
}

interface PermissionsConfig {
  types?: PermissionType[];         // Which permissions to track (default: all)
}

type PermissionChangeListener = (result: PermissionResult) => void;
```

---

## Internal Components

### Shared (no platform dependency)

#### `permission-store.ts` — In-memory state cache
- Stores `Map<PermissionType, PermissionStatus>`
- Pub/sub: `subscribe(listener)` returns unsubscribe function
- `getStatus(type)` returns current cached status (sync)
- `update(result)` sets status and notifies listeners only on actual change
- Not persisted — refreshed on app resume (mobile) or page visibility change (web)

#### `refresh-permissions.ts` — Bulk re-check
- Calls `checkPermission()` for each tracked permission type
- Updates store with fresh statuses
- Mobile: called on app resume to detect changes made in OS settings
- Web: called on `visibilitychange` event to detect browser permission changes

#### `use-permission.ts` — React hook
- Calls `Permissions.check(type)` on mount
- Subscribes to store via `Permissions.subscribe()`, filters for target type
- Returns current status + boolean helpers + bound `request`/`check` functions
- Cleans up subscription on unmount

#### `permissions.ts` — Orchestrator
- Wires all internal modules together
- Exposes the full public API
- Manages initialization state
- **Deduplication:** If `request(type)` is already in-flight for the same `PermissionType`, returns the same promise instead of triggering a second prompt
- Clears in-flight promise on resolve/reject
- Convenience boolean helpers (`isGranted`, `isLimited`, `isPermanentlyDenied`) read from store
- **`ensurePermission(type)`:** Orchestrates the full deny-to-granted flow — checks status, calls `request()` if re-promptable, calls `openSettings()` + awaits resume + `refreshAll()` if permanently denied, returns final status

### Platform: Native (`*.native.ts`)

#### `map-native-status.native.ts` — RN status normalization
- Maps `react-native-permissions` result strings to `PermissionStatus` enum
- `RESULTS.GRANTED` -> `Granted`, `RESULTS.DENIED` -> `Denied`, `RESULTS.BLOCKED` -> `PermanentlyDenied`, `RESULTS.LIMITED` -> `Limited`, `RESULTS.UNAVAILABLE` -> `NotAvailable`
- Pure function, no side effects

#### `check-permission.native.ts` — RN check
- Maps `PermissionType` to platform-specific permission constant
  - iOS: `PERMISSIONS.IOS.CAMERA`, `PERMISSIONS.IOS.PHOTO_LIBRARY`, etc.
  - Android: `PERMISSIONS.ANDROID.CAMERA`, `PERMISSIONS.ANDROID.READ_MEDIA_IMAGES`, etc.
- Handles Android API level differences:
  - SDK >= 33: `READ_MEDIA_IMAGES` + `READ_MEDIA_VIDEO` for photos
  - SDK < 33: `READ_EXTERNAL_STORAGE` for photos
- Cloud: iOS checks iCloud entitlement; Android returns `Granted` (OAuth, not OS permission)
- Returns normalized `PermissionResult`

#### `request-permission.native.ts` — RN request
- Calls `react-native-permissions` `request()` with the platform-mapped permission
- For Android photos on SDK >= 33: requests both `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO`, returns the most restrictive result
- Cloud: iOS triggers iCloud permission prompt; Android no-op returns `Granted`
- Returns normalized `PermissionResult`

#### `open-settings.native.ts` — RN settings redirect
- Calls `react-native-permissions` `openSettings()`
- Opens the app's settings page in OS settings

### Platform: Web (`*.web.ts`)

#### `map-native-status.web.ts` — Browser status normalization
- Maps `PermissionState` (`"granted"`, `"denied"`, `"prompt"`) to `PermissionStatus` enum
- `"granted"` -> `Granted`, `"denied"` -> `PermanentlyDenied` (browsers don't distinguish denied vs blocked), `"prompt"` -> `Denied` (user hasn't decided yet)
- Pure function, no side effects

#### `check-permission.web.ts` — Browser check
- Uses `navigator.permissions.query()` for camera, microphone, notifications
- Photos: always returns `Granted` (file input requires no browser permission)
- Cloud: always returns `NotAvailable` (cloud backup is OAuth-based, not a browser permission)
- Falls back to `NotAvailable` if `navigator.permissions` is not supported

#### `request-permission.web.ts` — Browser request
- Camera: calls `navigator.mediaDevices.getUserMedia({ video: true })`, releases stream on success, returns status
- Microphone: calls `navigator.mediaDevices.getUserMedia({ audio: true })`, releases stream on success, returns status
- Notifications: calls `Notification.requestPermission()`, returns mapped status
- Photos: no-op, returns `Granted`
- Cloud: no-op, returns `NotAvailable`

#### `open-settings.web.ts` — Browser settings (no-op)
- Browsers have no API to open permission settings
- No-op — resolves immediately
- Consumers should display instructional text instead (e.g., "Click the lock icon in your address bar")

---

## Dependencies

```json
{
  "dependencies": {
    "react": ">=18"
  },
  "peerDependencies": {
    "react-native": ">=0.76",
    "react-native-permissions": ">=4"
  },
  "peerDependenciesMeta": {
    "react-native": { "optional": true },
    "react-native-permissions": { "optional": true }
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

`react-native` and `react-native-permissions` are optional peer dependencies — required for mobile, not installed on web. `react` is a direct dependency for the `usePermission` hook.

---

## Platform-Specific Behavior

### iOS (via react-native-permissions)
| PermissionType | Native Permission | Notes |
|---|---|---|
| Camera | `PERMISSIONS.IOS.CAMERA` | |
| Photos | `PERMISSIONS.IOS.PHOTO_LIBRARY` | Can return `Limited` status |
| Microphone | `PERMISSIONS.IOS.MICROPHONE` | |
| Notifications | `PERMISSIONS.IOS.NOTIFICATIONS` | Can return `Provisional` |
| Cloud | iCloud entitlement check | Returns `NotAvailable` if iCloud not enabled on device |

### Android (via react-native-permissions)
| PermissionType | Native Permission (SDK >= 33) | Native Permission (SDK < 33) |
|---|---|---|
| Camera | `PERMISSIONS.ANDROID.CAMERA` | `PERMISSIONS.ANDROID.CAMERA` |
| Photos | `READ_MEDIA_IMAGES` + `READ_MEDIA_VIDEO` | `READ_EXTERNAL_STORAGE` |
| Microphone | `PERMISSIONS.ANDROID.RECORD_AUDIO` | `PERMISSIONS.ANDROID.RECORD_AUDIO` |
| Notifications | `PERMISSIONS.ANDROID.POST_NOTIFICATIONS` | Not required (auto-granted) |
| Cloud | Always `Granted` | Google Drive uses OAuth, not OS-level permission |

### Web (via Browser APIs)
| PermissionType | Browser API | Notes |
|---|---|---|
| Camera | `navigator.permissions.query({ name: "camera" })` / `getUserMedia({ video: true })` | Request triggers browser prompt |
| Photos | None required | File input needs no permission; always `Granted` |
| Microphone | `navigator.permissions.query({ name: "microphone" })` / `getUserMedia({ audio: true })` | Request triggers browser prompt |
| Notifications | `Notification.permission` / `Notification.requestPermission()` | |
| Cloud | N/A | Returns `NotAvailable`; cloud uses OAuth |

---

## Consumer Usage

```typescript
// App initialization (works on both mobile and web)
import { Permissions } from "@ion/permissions";

Permissions.initialize();

// Mobile: call on AppState resume
// Web: automatic via visibilitychange listener
Permissions.refreshAll();
```

```typescript
// In an action (platform-agnostic)
import { Permissions, PermissionType, PermissionStatus } from "@ion/permissions";

async function openCamera(): Promise<void> {
  const result = await Permissions.request(PermissionType.Camera);
  if (result.status !== PermissionStatus.Granted) {
    throw new ActionError("CAMERA_PERMISSION_DENIED", "Camera access is required.");
  }
  // proceed with camera
}
```

```typescript
// In a React component (works on both mobile and web)
import { usePermission, PermissionType } from "@ion/permissions";

function CameraButton() {
  const camera = usePermission(PermissionType.Camera);

  if (camera.isPermanentlyDenied) {
    return <SettingsRedirectButton />;
  }

  return (
    <Button
      onPress={camera.request}
      disabled={camera.isGranted}
    />
  );
}
```

```typescript
// Subscribe to changes (non-React context)
const unsubscribe = Permissions.subscribe((result) => {
  if (result.type === PermissionType.Notifications) {
    updateNotificationBadge(result.status);
  }
});
```

### Deny-to-Granted Flow

Users can change their mind after denying a permission. The package supports the full lifecycle:

```
Unknown ──request()──> Granted     (user approves)
Unknown ──request()──> Denied      (user declines, can ask again)
Denied  ──request()──> Granted     (user changes mind on second prompt)
Denied  ──request()──> PermanentlyDenied  (user declines again / "Don't ask again")
PermanentlyDenied ──openSettings() + refreshAll()──> Granted  (user toggles in OS settings)
```

**Using `ensurePermission()` (recommended):** Handles all transitions in a single call.

```typescript
// In an action — single call handles deny-to-granted
async function startRecording(): Promise<void> {
  const result = await Permissions.ensurePermission(PermissionType.Camera);
  if (result.status !== PermissionStatus.Granted) {
    throw new ActionError("CAMERA_DENIED", "Camera access is required to record.");
  }
  // proceed
}
```

**Using the hook — screen handles each state:**

```typescript
function CameraButton() {
  const camera = usePermission(PermissionType.Camera);

  // User denied once — can ask again
  if (camera.status === PermissionStatus.Denied) {
    return <Button title="Allow Camera" onPress={camera.request} />;
  }

  // User blocked permanently — redirect to settings
  if (camera.isPermanentlyDenied) {
    return (
      <SettingsRedirectButton
        message="Camera is blocked. Tap to open settings."
        onPress={() => Permissions.openSettings()}
      />
    );
    // Store auto-refreshes on app resume, hook re-renders with new status
  }

  // Restricted by OS (parental controls) — nothing we can do
  if (camera.status === PermissionStatus.Restricted) {
    return <Text>Camera restricted by device policy</Text>;
  }

  return <Button title="Record" onPress={startRecording} />;
}
```

**Mobile resume detection:** When the user returns from OS settings, the app resumes. `refreshAll()` is called on AppState `active` event, store updates, and any mounted `usePermission` hooks re-render with the fresh status. The `ensurePermission()` method handles this automatically by awaiting the resume event before returning.

**Web limitation:** Browsers don't expose a settings redirect. When `ensurePermission()` hits `PermanentlyDenied` on web, it returns immediately with that status. The consumer should show instructional text guiding the user to the browser's site settings (lock icon in address bar).

---

## Design Decisions

| Aspect | Decision | Rationale |
|---|---|---|
| Cross-platform via file extensions | `.native.ts` / `.web.ts` in `platform/` | Matches `@ion/storage` pattern; Metro resolves native, Webpack resolves web |
| No strategy/factory pattern | Platform branching via bundler resolution | Bundler already selects the right file; no runtime abstraction needed |
| No UI components | Foundation layer is UI-free | Permission-gated widgets, pre-permission sheets, and settings redirect dialogs belong in Actions/Screens layer |
| Request deduplication | Built into orchestrator `request()` | Prevents multiple native/browser dialogs when concurrent callers request the same permission |
| In-memory only cache | Not persisted to disk | OS/browser is the source of truth; cache refreshed on resume/visibility |
| `usePermission` hook included | Shared code, no platform dependency | Avoids every screen re-implementing subscribe/unsubscribe boilerplate; works on both platforms |
| Web request triggers prompt | `getUserMedia` / `Notification.requestPermission` | Consistent behavior — `request()` always attempts to obtain the permission, not just check |
| Web openSettings is no-op | Browsers have no settings redirect API | Consumers display instructional UI instead |
| RN peer deps are optional | Web app doesn't install react-native | Follows `@ion/storage` pattern with `peerDependenciesMeta.optional` |
| `ensurePermission` convenience | Single call handles deny-to-granted lifecycle | Eliminates duplicated check-then-request-or-redirect boilerplate across every consumer |

---

## Implementation Order

1. `types.ts` — zero dependencies, shared
2. `platform/map-native-status.native.ts` + `platform/map-native-status.web.ts` — depends on types only
3. `permission-store.ts` — depends on types only, shared
4. `platform/check-permission.native.ts` + `platform/check-permission.web.ts` — depends on types + map-native-status
5. `platform/request-permission.native.ts` + `platform/request-permission.web.ts` — depends on types + map-native-status
6. `platform/open-settings.native.ts` + `platform/open-settings.web.ts` — minimal deps
7. `refresh-permissions.ts` — depends on check-permission + permission-store, shared
8. `permissions.ts` — orchestrator, wires everything, shared
9. `use-permission.ts` — depends on permissions + react, shared
10. `index.ts` — re-exports
11. Test files alongside each source file

---

## Verification

1. **Type check:** `pnpm --filter @ion/permissions type-check`
2. **Lint:** `pnpm --filter @ion/permissions lint`
3. **Tests:** `pnpm --filter @ion/permissions test`
4. **Manual test — mobile check:** Call `Permissions.check(PermissionType.Camera)`, verify correct status
5. **Manual test — mobile request:** Call `Permissions.request(PermissionType.Camera)`, verify native dialog appears
6. **Manual test — web check:** Call `Permissions.check(PermissionType.Camera)` in browser, verify `navigator.permissions.query` result
7. **Manual test — web request:** Call `Permissions.request(PermissionType.Camera)` in browser, verify `getUserMedia` prompt appears
8. **Manual test — dedup:** Call `Permissions.request(PermissionType.Camera)` twice concurrently, verify only one prompt appears
9. **Manual test — settings (mobile):** Call `Permissions.openSettings()` after permanently denying, verify redirects to app settings
10. **Manual test — refresh:** Change permission while app is backgrounded, verify store updates on resume/visibility
11. **Manual test — hook:** Mount component with `usePermission(PermissionType.Camera)`, grant permission, verify re-render

---

## Architecture Doc Update

After implementation, update `.claude/architecture.md`:
- Change `@ion/permissions` status from `Planned` to `Implemented`
- Update description to: "Camera, photos, microphone, notifications, cloud permissions (iOS, Android, Web)"
