# @ion/permissions Architecture

Unified permissions management layer. Abstracts OS/browser permission handling for camera, photos, microphone, notifications, and cloud across iOS, Android, and web.

## Public API

```typescript
export { Permissions }       // Main orchestrator: check, request, ensure, subscribe
export { usePermission }     // React hook for reactive permission state
export { PermissionType, PermissionStatus }
export type { PermissionResult, PermissionsConfig, PermissionChangeListener }
```

## Data Structures

```typescript
enum PermissionType { Camera, Photos, Microphone, Notifications, Cloud }

enum PermissionStatus {
  Granted, Denied, Limited, PermanentlyDenied,
  Restricted, Provisional, Unknown, NotAvailable,
}

interface PermissionResult { type: PermissionType; status: PermissionStatus }
```

## Core Methods

| Method | Description |
|--------|-------------|
| `initialize(config?)` | Register tracked permission types |
| `check(type)` | Read current status from OS/browser |
| `request(type)` | Show permission prompt |
| `ensurePermission(type)` | Full lifecycle: check -> request -> open settings -> recheck |
| `checkAll()` | Check all tracked types |
| `subscribe(listener)` | Observe status changes. Returns unsubscribe function. |
| `isGranted(type)` | Sync check from cache |
| `openSettings()` | Redirect to app/browser settings |
| `refreshAll()` | Re-check all tracked types |

## Platform Behavior

| Permission | Native | Web |
|-----------|--------|-----|
| Camera | `react-native-permissions` | `navigator.mediaDevices.getUserMedia({video})` |
| Photos | iOS: Photo Library, Android: `READ_MEDIA_IMAGES` | Always Granted (file input) |
| Microphone | `react-native-permissions` | `getUserMedia({audio})` |
| Notifications | iOS/Android: native APIs | `Notification.requestPermission()` |
| Cloud | iOS: NotAvailable, Android: Granted | NotAvailable |
| Open Settings | `openSettings()` from react-native-permissions | No-op |

## Architecture

| Module | Responsibility |
|--------|---------------|
| `permissions.ts` | Orchestrator: check/request/ensure lifecycle, deduplication |
| `permission-store.ts` | In-memory state Map + listener Set |
| `use-permission.ts` | React hook: subscribes to store, returns reactive status |
| `refresh-permissions.ts` | Bulk re-check utility |
| `platform/check-permission.*` | Platform-specific status read |
| `platform/request-permission.*` | Platform-specific prompt |
| `platform/map-native-status.*` | Map native status strings to `PermissionStatus` enum |
| `platform/open-settings.*` | Platform-specific settings redirect |

## Design Decisions

- **In-flight deduplication**: Maps track pending requests to prevent duplicate prompts.
- **Terminal statuses**: `Restricted` and `NotAvailable` are end states -- no requests possible.
- **ensurePermission lifecycle**: Denied -> request -> permanently denied -> open settings -> recheck.
- **Observer pattern**: UI subscribes to changes. Store broadcasts on every update.

## Dependencies

- **Downstream**: None (foundation layer)
- **Peer deps**: `react-native-permissions` (optional)
- **Upstream consumers**: `@ion/media`, `@ion/onboarding`, actions

## File Structure

```
src/
  index.ts
  types.ts
  permissions.ts                    # Orchestrator
  permission-store.ts               # In-memory state
  use-permission.ts                 # React hook
  refresh-permissions.ts
  platform/
    check-permission.{ts,native.ts,web.ts}
    request-permission.{ts,native.ts,web.ts}
    map-native-status.{ts,native.ts,web.ts}
    open-settings.{ts,native.ts,web.ts}
    native-modules.d.ts
  *.test.ts
```
